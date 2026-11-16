// Yerleşik içerik: konu anlatımları ve soru bankası
import type { BankQ, Lesson } from "../types";
import { BANK1 } from "./bank1";
import { BANK2 } from "./bank2";
import { LESSONS1 } from "./lessons1";
import { LESSONS2 } from "./lessons2";
import "./lessons3"; // LESSONS2'ye ikinci partları ekler

export const LESSONS: Record<string, Lesson> = { ...LESSONS1, ...LESSONS2 };

export const qhash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return "b" + (h >>> 0).toString(36);
};

export const BANK_ALL: BankQ[] = (() => {
  const all = [...BANK1, ...BANK2];
  const gp: Record<number, string> = {};
  all.forEach((x) => {
    if (x.g && x.p) gp[x.g] = x.p;
  });
  return all.map((x) => ({
    bid: qhash((x.g ? "g" + x.g : "") + x.q),
    fam: x.f,
    sec: x.s,
    g: x.g || null,
    p: x.p || (x.g ? gp[x.g] : "") || "",
    q: x.q,
    o: x.o,
    a: x.a,
    lab: x.l || "",
    hint: x.h || "",
    x: x.x || "",
    d: x.d || [],
    tip: x.t || "",
  }));
})();
