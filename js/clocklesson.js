// 時鐘小學堂的課程內容：只教長針、短針、整點、半點。純資料和純邏輯，不碰 DOM。
// 角色：時鐘「滴答」；短針上是小烏龜（走得慢，告訴你幾點）；長針上是小兔子（跑得快，跑一圈是一小時）。
//
// 每一步的格式：
//   say   要顯示、要念的話
//   time  [幾點, 幾分]，時鐘要顯示的時間（不寫就維持上一步）
//   hl    要發亮的東西："short" 短針、"long" 長針、"both"、"nums" 全部數字、或數字 1–12
//   spin  true = 針慢慢走過去（用來示範小兔子跑一圈）
//   scene 生活情境小圖："sun" 起床、"bowl" 吃飯、"bag" 上學、"cookie" 點心、"moon" 睡覺
//   互動（有 do 的步驟要小朋友做完才能往下）：
//     do: "tapHand", target: "short" | "long"      點對的那根針
//     do: "tapNum",  target: 數字                   點對的數字
//     do: "set",     target: [幾點, 幾分], hands    把時鐘撥到這個時間（hands 是可以撥的針）
//     do: "ask",     choices: [[幾點, 幾分], ...]   選現在幾點（答案是這一步的 time）
import { timeText } from "./kids.js";

export { timeText };
export const handAngles = (h, m) => ({ ha: ((h % 12) + m / 60) * 30, ma: m * 6 });
// 針只往前走：回傳「大於等於目前角度、而且指向 target」的最小角度
export function forwardAngle(current, target) {
  const k = Math.ceil((current - target) / 360 - 1e-9);
  return target + 360 * Math.max(k, 0);
}

const rnd = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const nextHour = (h) => (h % 12) + 1;
// 問「現在幾點」的選項：正確時間，加上容易看錯的（下一個小時、整點和半點弄反）
function choicesFor(h, m, rng) {
  const set = [[h, m], [h, m === 0 ? 30 : 0], [nextHour(h), m]];
  for (let i = set.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [set[i], set[j]] = [set[j], set[i]]; }
  return set;
}
const ask = (h, m, say, rng, extra = {}) => ({ say, time: [h, m], do: "ask", choices: choicesFor(h, m, rng), ...extra });

export const CHAPTERS = [
  { id: "meet", title: "認識滴答", sub: "時鐘有數字和兩根針" },
  { id: "short", title: "短針小烏龜", sub: "短針告訴你幾點" },
  { id: "long", title: "長針小兔子", sub: "長針跑一圈是一小時" },
  { id: "hour", title: "整點", sub: "長針指 12" },
  { id: "half", title: "半點", sub: "長針指 6" },
  { id: "review", title: "口訣和挑戰", sub: "整點、半點一起來" },
];

export function chapterSteps(id, rng = Math.random) {
  switch (id) {
    case "meet": return [
      { say: "嗨！我是時鐘滴答。滴答滴答，我會告訴你現在幾點。", time: [10, 0] },
      { say: "我的臉上有 12 個數字，從 1 排到 12，繞成一個圓圈。", hl: "nums" },
      { say: "我有兩根針。一根短短的，一根長長的。", hl: "both" },
      { say: "紅色短短的是短針，上面坐著小烏龜。", hl: "short" },
      { say: "藍色長長的是長針，上面坐著小兔子。", hl: "long" },
      { say: "考考你！哪一根是短針？點點看。", do: "tapHand", target: "short" },
      { say: "那哪一根是長針呢？點點看。", do: "tapHand", target: "long" },
      { say: "太棒了！短針是紅色的小烏龜，長針是藍色的小兔子。", hl: "both" },
    ];
    case "short": return [
      { say: "小烏龜坐在短針上。牠走得很慢、很慢。", time: [3, 0], hl: "short" },
      { say: "短針指著哪個數字，就是幾點。現在短針指著 3。", hl: 3 },
      { say: "看！小烏龜慢慢走，從 3 走到 4。", time: [4, 0], spin: true, hl: "short" },
      { say: "現在短針指著 4。", hl: 4 },
      { say: "換你了！幫小烏龜把短針撥到 5。點一下數字 5。", time: [4, 0], do: "set", target: [5, 0], hands: ["short"] },
      { say: "再來一次！把短針撥到 9。", do: "set", target: [9, 0], hands: ["short"] },
      { say: "好厲害！記住囉，短針指幾，就是幾點。", hl: "short" },
    ];
    case "long": return [
      { say: "小兔子坐在長針上。牠跑得很快！", time: [3, 0], hl: "long" },
      { say: "小兔子的家在 12。牠都從 12 出發。", hl: 12 },
      { say: "預備，跑！小兔子跑了一整圈，又回到 12。", time: [4, 0], spin: true, hl: "long" },
      { say: "小兔子跑一圈，小烏龜才走一格，從 3 走到 4。", hl: "short" },
      { say: "小兔子跑一圈，就是過了一個小時。", hl: "long" },
      { say: "小兔子的家在哪個數字？點點看。", do: "tapNum", target: 12 },
      { say: "答對了！長針從 12 出發，跑一圈回到 12。", hl: 12 },
    ];
    case "hour": return [
      { say: "長針指著 12 的時候，叫做「整點」。", time: [7, 0], hl: "long" },
      { say: "整點的時候，看短針就好。短針指 7，就是 7 點。", hl: "short" },
      { say: "早上 7 點，太陽出來了，起床囉！", scene: "sun", hl: 7 },
      { say: "現在長針指 12，短針也指 12，就是 12 點。", time: [12, 0], spin: true, hl: "both" },
      { say: "中午 12 點，肚子餓了，吃午餐！", scene: "bowl" },
      ask(3, 0, "下午吃點心的時間到了。長針指 12，短針指 3。現在幾點？", rng, { scene: "cookie" }),
      { say: "晚上 9 點要睡覺了。把時鐘撥到 9 點！", time: [3, 0], scene: "moon", do: "set", target: [9, 0], hands: ["short"] },
      ask(6, 0, "最後一題！現在幾點？", rng),
      { say: "你學會整點了！長針指 12，短針指幾就是幾點。", hl: "long" },
    ];
    case "half": return [
      { say: "現在是 3 點。小兔子要出發囉！", time: [3, 0], hl: "long" },
      { say: "小兔子跑了半圈，跑到 6。", time: [3, 30], spin: true, hl: "long" },
      { say: "長針指著 6，就是幾點「半」。", hl: 6 },
      { say: "小烏龜走到 3 和 4 的中間。牠走過 3 了，還沒到 4。", hl: "short" },
      { say: "所以現在是 3 點半。", hl: "both" },
      { say: "短針走過 7，長針指 6，是 7 點半。背書包上學去！", time: [7, 30], spin: true, scene: "bag" },
      ask(8, 30, "長針指 6，短針走過 8。現在幾點？", rng),
      { say: "短針在 12 和 1 的中間，牠剛走過 12，所以是 12 點半。", time: [12, 30], spin: true, hl: "short" },
      { say: "換你撥！把時鐘撥到 4 點半。先撥短針到 4，再把長針撥到 6。", time: [2, 0], do: "set", target: [4, 30], hands: ["short", "long"] },
      ask(10, 30, "最後一題！現在幾點？", rng),
      { say: "你學會半點了！長針指 6，就是幾點半。", hl: "long" },
    ];
    case "review": {
      const steps = [
        { say: "我們來念口訣！長針指 12，幾點整。", time: [5, 0], hl: 12 },
        { say: "長針指 6，幾點半。", time: [5, 30], spin: true, hl: 6 },
        { say: "準備好了嗎？挑戰開始！" },
      ];
      // 4 題：2 題整點、2 題半點，順序打亂，小時不重複
      const hours = new Set();
      while (hours.size < 4) hours.add(rnd(rng, 1, 12));
      const hs = [...hours], mins = [0, 30, 0, 30];
      for (let i = mins.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [mins[i], mins[j]] = [mins[j], mins[i]]; }
      hs.forEach((h, i) => steps.push(ask(h, mins[i], `第 ${i + 1} 題。現在幾點？`, rng)));
      const th = rnd(rng, 1, 11);
      steps.push({ say: `最後一關！把時鐘撥到 ${timeText(th, 30)}。`, time: [12, 0], do: "set", target: [th, 30], hands: ["short", "long"] });
      steps.push({ say: "恭喜你！你會看整點和半點了。滴答為你拍拍手！", hl: "both" });
      return steps;
    }
    default: return [];
  }
}

// 撥時鐘：在「撥短針」或「撥長針」的時候點了數字 n，時間會變成什麼。
// 長針只能指 12（整點）或 6（半點）；點別的數字回傳 null，畫面會提醒。
export function applyTap(time, hand, n) {
  if (hand === "short") return [n, time[1]];
  if (n === 12) return [time[0], 0];
  if (n === 6) return [time[0], 30];
  return null;
}
export const sameTime = (a, b) => a[0] % 12 === b[0] % 12 && a[1] === b[1];
