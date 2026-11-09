// 關卡設定。新增關卡：在 logic.js 寫步驟產生器和出題函式，再在這裡加一筆並把 ready 設成 true。
import * as L from "./logic.js";

const DIRECT = [[2, "+", 2], [1, "+", 5], [3, "+", 6], [8, "-", 3], [9, "-", 5], [7, "-", 6]];

export const LEVELS = [
  {
    id: 1, title: "認識算盤", sub: "上珠是 5，下珠是 1", ready: true,
    demos: () => [{ label: "認識算盤", build: L.buildIntroSteps }],
    question: L.q1,
  },
  {
    id: 2, title: "直接加減", sub: "珠子夠撥，就直接撥", ready: true,
    demos: () => DIRECT.map(([a, op, n]) => ({ label: `${a} ${L.opSym(op)} ${n}`, build: () => L.buildDirectSteps(a, op, n) })),
    question: L.q2,
  },
  {
    id: 3, title: "五的好朋友", sub: "下珠不夠，請五來幫忙", ready: true,
    rules: L.FIVE_RULES,
    demosFor: (r) => L.fiveStarts(r).map((a) => ({ label: `${a} ${L.opSym(r.op)} ${r.n}`, build: () => L.buildFiveSteps(r, a) })),
    question: L.q3,
  },
  { id: 4, title: "十的好朋友", sub: "要進位、退位的時候", ready: false },
  { id: 5, title: "五和十一起用", sub: "例如 7 + 6", ready: false },
  { id: 6, title: "兩位數", sub: "好幾檔一起撥", ready: false },
  { id: 7, title: "珠心算", sub: "腦中想像算盤", ready: false },
];
