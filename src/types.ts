// Ortak tipler

export type Light = "red" | "yellow" | "green" | "none";

/** Soru bankasındaki ham soru (content/bank*.ts) */
export interface RawQ {
  f: string; // aile
  s: string; // bölüm
  q: string;
  o: string[];
  a: number;
  l?: string; // beklenen etiket
  h?: string; // ipucu
  x?: string; // açıklama
  d?: string[]; // şık başına neden yanlış
  t?: string; // püf
  g?: number; // parça grubu
  p?: string; // parça metni (grubun ilk sorusunda)
}

/** Oyunda kullanılan soru */
export interface Question {
  id: string;
  bid?: string; // banka kimliği
  fam: string;
  sec: string;
  g?: number | null;
  p: string;
  q: string;
  o: string[];
  a: number;
  lab: string;
  hint: string;
  x: string;
  d: string[];
  tip: string;
  rep: boolean;
  repFrom?: string | null;
}

export interface BankQ extends Omit<Question, "id" | "rep"> {
  bid: string;
}

export interface LessonExample {
  q: string;
  o?: string[];
  a: number;
  neden?: string;
  celdiriciler?: string[];
}

export interface LessonPart {
  baslik?: string;
  anlatim?: string;
  sence?: { soru: string; cevap?: string } | null;
  tablo?: { cols: string[]; rows: string[][] } | null;
  kutular?: { tur: string; metin: string }[];
  /** Hızlı tatbikat: ilk sütun soru, diğer sütunlar cevap */
  tatbikat?: { cols: string[]; rows: string[][] } | null;
  ornekler?: LessonExample[];
  ornek_soru?: { q: string; o?: string[]; a: number; cevap?: string } | null;
}

export interface Lesson {
  mantik?: string;
  terimler?: { terim: string; tanim: string; ornek?: string }[];
  kontrol?: string[];
  parts: LessonPart[];
  tuzaklar?: string[];
  hatirlanacaklar?: string[];
}

export interface Topic {
  w: number;
  id: string;
  t: string;
  kind?: "mock" | "review";
  f: string[];
}

export interface FamState {
  light: Light;
  wrong: number;
  streak: number;
  ok: number;
  n: number;
  last: number;
  due: string | null;
  note: string;
}

export interface Attempt {
  t: number;
  fam: string;
  sec: string;
  ok: 0 | 1;
  fin: 0 | 1;
  u: 0 | 1;
  s: number;
  src: string;
  rep: 0 | 1;
  lab: string;
}

export interface Mistake {
  id: string;
  t: number;
  fam: string;
  sec: string;
  p: string;
  q: string;
  o: string[];
  a: number;
  ua: number | null;
  x: string;
  tip: string;
  lab: string;
  un: 0 | 1;
  diag: string;
  /** Kısa kod: I3 = ısınma 3, S5 = set 5, D2 = drill 2, T7 = seviye testi 7, M41 = deneme 41 */
  ref?: string;
}

export interface VocabItem {
  id: string;
  w: string;
  m: string;
  ex: string;
  prep: boolean;
  day: string;
  box: number;
  due: string;
  ok: number;
  bad: number;
}

export interface SessionRec {
  id: string;
  date: string;
  kind: string;
  topic?: string | null;
  n: number;
  c: number;
  cf: number;
  p: number;
  pf: number | null;
  spq: number | null;
  dur: number;
  /** Günün türü: konu, tekrar (açık kapama) */
  type?: string;
  /** false → set bitirilmeden çıkıldı, gün tamamlanmış sayılmaz */
  done?: boolean;
}

export interface Decision {
  guclu?: string;
  zayif?: string;
  teshis?: string;
  onlem?: string;
  yarin?: string;
}

export interface MockRec {
  id: string;
  date: string;
  label: string;
  n: number;
  c: number;
  w: number;
  score: number;
  dur: number;
  t40: number | null;
  cp: Record<number, number>;
  bySec: Record<string, { n: number; c: number; w: number }>;
}

export interface Profile {
  examDate: string;
  examSet?: boolean;
  target: number;
  dailyMin: number;
  time: string;
  vocabTime: string;
  defterDay: number;
  defterTime: string;
  days: number[];
  format: "step" | "all";
  remind: boolean;
  /** Plan modeli: kullanıcı başta seçer */
  model?: "sirali" | "uyarlanan" | "acik";
  modelSet?: boolean;
}

export interface State {
  v: 2;
  onboarded: boolean;
  tanima: boolean;
  profile: Profile;
  topics: { id: string; status: "aktif" | "bekliyor" | "tamam" }[];
  fams: Record<string, FamState>;
  attempts: Attempt[];
  mistakes: Mistake[];
  vocab: VocabItem[];
  sessions: SessionRec[];
  decisions: { t: number; d: Decision }[];
  mocks: MockRec[];
  skips: string[];
  todos: { id: string; t: string; done: boolean }[];
  seen: Record<string, string>;
  /** Konu testleri: deneme sayısı, son ve en iyi yüzde */
  topicLog: Record<string, { n: number; last: number; best: number; date: string; needGap?: boolean; weak?: boolean; skipped?: boolean }>;
  /** Güne özel seçimler: t = kullanıcı açık kapatmak istedi, i = hafif gün hakkı kullanıldı */
  dayMode: Record<string, { t?: "tekrar" | "konu"; i?: "hafif" }>;
  /** Yarından geçerli olacak plan değişikliği */
  pending?: { from: string; model: "sirali" | "uyarlanan" | "acik"; days: number[]; dailyMin: number } | null;
  /** Son yerel değişikliğin zamanı (ms); eşitlemede hangi tarafın yeni olduğunu belirler */
  upd?: number;
  /** Silinen yapılacakların kimlikleri; eşitlemede geri gelmesinler diye */
  gone?: string[];
}

/** Tek bir soru kartının durumu */
export interface CardState {
  stage: "label" | "opts" | "retry" | "done";
  label: string;
  first: number | null;
  second: number | null;
  t0: number;
  sec: number;
  un: boolean;
  diag: string[];
  diagTxt: string;
  famChange: { before: Light; after: Light } | null;
  mid?: string;
  ref?: string;
}
