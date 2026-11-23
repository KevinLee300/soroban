import { GAMES } from "./kids.js";
import { LEVELS } from "./levels.js";
import { units } from "./grade2.js";

export const filters = {
  level: ["剛開始學", "基礎練習", "進階挑戰"],
  method: ["跟著學", "動手玩", "做練習", "紙筆練習", "雙人合作"],
  topic: ["數感", "加減", "乘除", "珠算", "時間", "圖形與測量", "規律與推理", "錢幣", "綜合"]
};

// 程度表示開始這項活動需要的基礎。同一活動可以用不同方式學。
function entry(route, title, sub, level, method, topic) {
  return { route, title, sub, level: level.split("、"), method: method.split("、"), topic: topic.split("、") };
}

const kidsTopics = {
  mix: "綜合",
  count: "數感", more: "數感", numcmp: "數感", next: "數感",
  add: "加減", sub: "加減", make: "加減", share: "乘除", shape: "圖形與測量",
  length: "圖形與測量", pattern: "規律與推理", coins: "錢幣", clock: "時間",
  clockpick: "時間", story: "加減", order: "規律與推理", odd: "規律與推理", machine: "規律與推理"
};
const unitTopics = ["加減", "乘除", "時間", "乘除", "圖形與測量"];

export const collections = [
  { title: "幼兒數學", entries: GAMES.map(g =>
    entry("#math-" + g.id, g.title, g.sub, g.id === "mix" ? "基礎練習、進階挑戰" : "剛開始學、基礎練習", "動手玩、做練習", kidsTopics[g.id])) },
  { title: "時鐘小學堂", entries: [
    entry("#clock", "跟著滴答撥時鐘", "認識長針和短針，試著撥出整點和半點。", "剛開始學、基礎練習", "跟著學、動手玩", "時間")
  ] },
  { title: "珠算闖關", entries: LEVELS.filter(l => l.ready).map(l =>
    entry("#level-" + l.id, l.title, l.sub, l.id === 1 ? "剛開始學" : l.id === 4 ? "進階挑戰" : "基礎練習",
      "跟著學、動手玩、做練習", l.id === 1 ? "珠算、數感" : "珠算、加減")) },
  { title: "二上數學教室", entries: units.flatMap((u, n) =>
    u.lessons.map((l, i) => entry("#grade2-" + (n + 6) + "-" + (i + 1), l.title, "第 " + (n + 6) + " 單元・" + u.title,
      "基礎練習", "跟著學、做練習", unitTopics[n]))) },
  { title: "九九乘法", entries: [
    entry("#times", "乘法表與口訣", "點一格，看算式、聽口訣。", "基礎練習", "跟著學", "乘除"),
    entry("#times-garden", "乘法花園", "把花種成一排排，看看一共有幾朵。", "剛開始學、基礎練習", "動手玩", "乘除"),
    entry("#times-island", "跳島探險", "選每次跳幾格，一路跳到寶箱。", "基礎練習", "動手玩", "乘除、規律與推理"),
    entry("#times-bridge", "乘法修橋隊", "把乘法拆成兩段，接起整座橋。", "進階挑戰", "動手玩", "乘除"),
    entry("#times-snack", "點心店出貨", "把點心裝成每盒一樣多，數數有幾盒。", "基礎練習、進階挑戰", "動手玩", "乘除"),
    entry("#times-practice", "乘法練習", "用數字鍵盤填乘法答案。", "基礎練習", "做練習", "乘除"),
    entry("#times-story-1", "生活乘法題", "從故事裡找出每組有幾個、有幾組。", "基礎練習", "做練習", "乘除"),
    entry("#times-weak", "弱點加強", "再練容易弄錯的算式。", "基礎練習、進階挑戰", "做練習", "乘除"),
    entry("#times-timed", "限時 60 秒", "在一分鐘內試試熟悉的乘法。", "進階挑戰", "做練習", "乘除")
  ] },
  { title: "練習單與題庫", entries: [
    entry("#sheet", "數學練習單", "填數字、比大小、練加減，也可以列印。", "剛開始學、基礎練習、進階挑戰", "做練習、紙筆練習", "數感、加減、規律與推理"),
    entry("#drill", "算盤題庫", "拿實體算盤跟著題目撥，也可以列印。", "基礎練習、進階挑戰", "紙筆練習、做練習", "珠算、加減")
  ] },
  { title: "一起守城堡", entries: [
    entry("#duo", "兩人合作守城堡", "共用一台平板，兩個人各選適合自己的題目。", "剛開始學、基礎練習、進階挑戰", "動手玩、雙人合作", "數感、加減、乘除、時間")
  ] }
];

export function matchingCollections(selected) {
  return collections.map(group => ({ ...group, entries: group.entries.filter(item =>
    Object.keys(filters).every(key => !selected[key] || item[key].includes(selected[key])))
  })).filter(group => group.entries.length);
}
