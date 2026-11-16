// Tarih ve biçim yardımcıları (yerel saat, YYYY-AA-GG)
export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const today = () => ymd(new Date());
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const dow = (s: string) => parse(s).getDay();
export const diffDays = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);
export const DOW = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
export const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const fmtDate = (s: string) => {
  const d = parse(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${DOW[d.getDay()]}`;
};
export const fmtShort = (s: string) => {
  const d = parse(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
};
export const dayOf = (t: number) => ymd(new Date(t));
export const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parse(s)) === s;
export const isHm = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const mmss = (s: number) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
export const hhmmss = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(Math.floor(s % 60))}`;
export const pct = (c: number, n: number) => (n ? Math.round((c / n) * 100) : 0);
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export function shuffle<T>(a: T[]): T[] {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
