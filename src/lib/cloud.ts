// Supabase: Google ile isteğe bağlı giriş ve çalışma verilerinin cihazlar arası eşitlenmesi.
// Uygulama girişsiz de tam çalışır; giriş yapılınca yerel veri bulutla birleştirilir.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";
import { defaultState, normalize, onSaved, replaceState, S } from "./store";
import { mergeStates } from "./sync";

WebBrowser.maybeCompleteAuthSession();

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
/** .env dosyasında Supabase bilgileri var mı */
export const cloudReady = !!(URL_ && ANON);

const sb: SupabaseClient | null = cloudReady
  ? createClient(URL_!, ANON!, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === "web", flowType: "pkce" },
    })
  : null;

const TABLE = "user_state";
const LAST_USER = "optik-cloud-user"; // bu cihazın en son eşitlendiği hesap

export interface CloudInfo {
  email: string | null;
  status: "off" | "idle" | "syncing" | "error";
  last: number | null;
  err: string;
}

let info: CloudInfo = { email: null, status: "off", last: null, err: "" };
let ver = 0;
const subs = new Set<() => void>();
const set = (p: Partial<CloudInfo>) => {
  info = { ...info, ...p };
  ver++;
  subs.forEach((f) => f());
};

/** Profil ekranı için giriş ve eşitleme durumu */
export function useCloud(): CloudInfo {
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => ver,
  );
  return info;
}

let session: Session | null = null;
let running = false;
let again = false;
let debounce: ReturnType<typeof setTimeout> | undefined;

/** Buluttaki durumu çeker, yereldekiyle birleştirir, sonucu iki tarafa da yazar. */
export async function syncNow(): Promise<void> {
  if (!sb || !session) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  set({ status: "syncing", err: "" });
  try {
    const uid = session.user.id;
    const { data, error } = await sb.from(TABLE).select("data").eq("user_id", uid).maybeSingle();
    if (error) throw error;
    let merged = S;
    if (data?.data) {
      const remote = normalize(data.data);
      // Bu cihaz bu hesapla ilk kez eşitleniyorsa profil ve plan buluttan gelsin
      const first = (await AsyncStorage.getItem(LAST_USER)) !== uid;
      merged = mergeStates(first ? { ...S, upd: 0 } : S, remote);
      replaceState(merged);
    }
    const up = await sb.from(TABLE).upsert({ user_id: uid, data: merged, updated_at: new Date().toISOString() });
    if (up.error) throw up.error;
    await AsyncStorage.setItem(LAST_USER, uid);
    set({ status: "idle", last: Date.now() });
  } catch (e: any) {
    set({ status: "error", err: e?.message || "Bağlantı kurulamadı" });
  } finally {
    running = false;
    if (again) {
      again = false;
      syncNow();
    }
  }
}

function onSession(s: Session | null) {
  session = s;
  set({ email: s?.user.email ?? null, status: s ? "idle" : "off" });
  if (s) syncNow();
}

/** Uygulama açılınca bir kez çağrılır (yerel veri yüklendikten sonra). */
export function initCloud() {
  if (!sb) return;
  sb.auth.getSession().then(({ data }) => onSession(data.session));
  sb.auth.onAuthStateChange((ev, s) => {
    if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") onSession(s);
    else session = s;
  });
  // Yerel değişiklikten birkaç saniye sonra ve uygulama öne gelince eşitle
  onSaved(() => {
    if (!session) return;
    clearTimeout(debounce);
    debounce = setTimeout(syncNow, 4000);
  });
  AppState.addEventListener("change", (st) => {
    if (st === "active") syncNow();
  });
}

/** Google ile giriş. Webde sayfa Google'a gider ve geri döner; telefonda tarayıcı penceresi açılır. */
export async function signInGoogle(): Promise<void> {
  if (!sb) return;
  set({ err: "" });
  try {
    if (Platform.OS === "web") {
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (error) throw error;
      return;
    }
    const redirectTo = Linking.createURL("auth");
    const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data?.url) throw error || new Error("Giriş başlatılamadı");
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== "success") return; // kullanıcı pencereyi kapattı
    const code = new URL(res.url).searchParams.get("code");
    if (!code) throw new Error("Giriş tamamlanamadı");
    const ex = await sb.auth.exchangeCodeForSession(code);
    if (ex.error) throw ex.error;
  } catch (e: any) {
    set({ status: session ? "idle" : "off", err: e?.message || "Giriş yapılamadı" });
  }
}

/** Çıkış: bu telefondaki veriler yerinde kalır, yalnızca eşitleme durur. */
export async function signOut(): Promise<void> {
  if (!sb) return;
  clearTimeout(debounce);
  await sb.auth.signOut();
}

/** Girişliyken sıfırlama: buluttaki kopya da boş durumla değiştirilir, yoksa eşitleme eskileri geri getirirdi. */
export async function resetCloud(): Promise<void> {
  if (!sb || !session) return;
  const fresh = { ...defaultState(), upd: Date.now() };
  await sb.from(TABLE).upsert({ user_id: session.user.id, data: fresh, updated_at: new Date().toISOString() });
}
