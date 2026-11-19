// İki cihazın durumunu kayıp olmadan birleştirir (saf fonksiyon, ağ yok).
// Kayıt listeleri birleştirilir; tek değerli alanlarda (profil, plan, konular) son değişen taraf kazanır.
import type { State } from "../types";

type Keyed<T> = (x: T) => string;

/** İki listeyi anahtara göre birleştirir; çakışmada pick kazananı seçer. */
function union<T>(a: T[], b: T[], key: Keyed<T>, pick: (x: T, y: T) => T = (x) => x): T[] {
  const m = new Map<string, T>();
  for (const x of a) m.set(key(x), x);
  for (const y of b) {
    const k = key(y);
    const x = m.get(k);
    m.set(k, x === undefined ? y : pick(x, y));
  }
  return [...m.values()];
}

/** Anahtar başına birleştirme; çakışmada pick kazananı seçer. */
function mergeRec<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const k of Object.keys(b)) out[k] = k in a ? pick(a[k], b[k]) : b[k];
  return out;
}

const byT = <T extends { t: number }>(x: T[]) => x.sort((p, q) => p.t - q.t);
const byDate = <T extends { date: string }>(x: T[]) => x.sort((p, q) => (p.date < q.date ? -1 : p.date > q.date ? 1 : 0));

/**
 * local ve remote'u birleştirir. Daha yeni kaydedilen taraf (upd) "yeni" sayılır:
 * profil, konu durumları, bekleyen plan değişikliği, onboarding gibi tek değerli alanlar ondan gelir.
 */
export function mergeStates(local: State, remote: State): State {
  const lNew = (local.upd || 0) >= (remote.upd || 0);
  const N = lNew ? local : remote; // yeni
  const O = lNew ? remote : local; // eski
  const newer = <T>(x: T, y: T) => (lNew ? x : y); // x local, y remote
  const gone = Array.from(new Set([...(local.gone || []), ...(remote.gone || [])])).slice(-200);
  const dead = new Set(gone);

  return {
    ...O,
    ...N,
    onboarded: local.onboarded || remote.onboarded,
    tanima: local.tanima || remote.tanima,
    // Aile durumu: daha çok soru görmüş taraf daha güncel
    fams: mergeRec(local.fams, remote.fams, (x, y) => (y.n > x.n ? y : y.n < x.n ? x : newer(x, y))),
    attempts: byT(union(local.attempts, remote.attempts, (x) => `${x.t}|${x.fam}|${x.sec}|${x.src}`)),
    mistakes: byT(union(local.mistakes, remote.mistakes, (x) => x.id, newer)),
    // Kelime kartı: daha çok tekrar görmüş taraf
    vocab: union(local.vocab, remote.vocab, (x) => x.id, (x, y) => (y.ok + y.bad > x.ok + x.bad ? y : y.ok + y.bad < x.ok + x.bad ? x : newer(x, y))),
    sessions: byDate(union(local.sessions, remote.sessions, (x) => x.id)),
    decisions: byT(union(local.decisions, remote.decisions, (x) => `${x.t}`)),
    mocks: byDate(union(local.mocks, remote.mocks, (x) => x.id)),
    skips: Array.from(new Set([...local.skips, ...remote.skips])),
    todos: union(local.todos, remote.todos, (x) => x.id, newer).filter((x) => !dead.has(x.id)),
    seen: mergeRec(local.seen, remote.seen, (x, y) => (y > x ? y : x)),
    topicLog: mergeRec(local.topicLog, remote.topicLog, (x, y) => (y.n > x.n ? y : y.n < x.n ? x : newer(x, y))),
    dayMode: mergeRec(local.dayMode, remote.dayMode, (x, y) => ({ ...(lNew ? y : x), ...(lNew ? x : y) })),
    gone,
    upd: Math.max(local.upd || 0, remote.upd || 0),
  };
}
