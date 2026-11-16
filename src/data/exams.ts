// Sınav listesi. "ready" olanlar açılır; diğerleri seçim ekranında "Yakında" olarak görünür.
export interface Exam {
  id: string;
  name: string;
  desc: string;
  ready: boolean;
}

export const EXAMS: Exam[] = [
  { id: "yds", name: "YDS", desc: "Yabancı Dil Sınavı · İngilizce", ready: true },
  { id: "yokdil", name: "YÖKDİL", desc: "Fen, sosyal ve sağlık bilimleri", ready: false },
  { id: "kpss", name: "KPSS", desc: "Genel yetenek ve genel kültür", ready: false },
  { id: "ales", name: "ALES", desc: "Sayısal ve sözel", ready: false },
  { id: "tus", name: "TUS", desc: "Tıpta uzmanlık", ready: false },
  { id: "dus", name: "DUS", desc: "Diş hekimliğinde uzmanlık", ready: false },
];

export const examName = (id: string | null) => EXAMS.find((e) => e.id === id)?.name || "";
