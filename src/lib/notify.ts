// Telefon hatırlatıcıları: günlük oturum (çalışma günleri), kelime tekrarı (her gün), haftalık defter
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { S } from "./store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const hm = (t: string) => {
  const [hour, minute] = t.split(":").map(Number);
  return { hour, minute };
};

/** Ayarlardaki saatlere göre bütün hatırlatıcıları yeniden kurar. Dönüş: izin verildi mi */
export async function syncReminders(ask = true): Promise<boolean> {
  try {
    const p = S.profile;
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && !ask) return false;
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!p.remind) return true;
    if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync("hatirlatici", { name: "Hatırlatıcılar", importance: Notifications.AndroidImportance.HIGH });
    const W = Notifications.SchedulableTriggerInputTypes.WEEKLY;
    const channelId = "hatirlatici";
    for (const d of p.days)
      await Notifications.scheduleNotificationAsync({
        content: { title: "YDS oturumu zamanı", body: `Günlük oturum: ${p.dailyMin} dk. Isınma, kelimeler, konu ve set.` },
        trigger: { type: W, weekday: d + 1, ...hm(p.time), channelId },
      });
    await Notifications.scheduleNotificationAsync({
      content: { title: "Kelime tekrarı", body: "10 dakikalık kelime tekrarı." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...hm(p.vocabTime), channelId },
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: "Haftalık defter", body: "Haftalık defterin hazır: Defter › Haftalık defter." },
      trigger: { type: W, weekday: +p.defterDay + 1, ...hm(p.defterTime), channelId },
    });
    return true;
  } catch {
    return false;
  }
}
