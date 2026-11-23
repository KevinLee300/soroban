import { saveStars, loadProgress } from "./storage.js";

export const playGames = [
  { id: "market", title: "硬幣小市集", sub: "把硬幣放上托盤，湊出點心的價錢。", topic: "錢幣、加減" },
  { id: "mirror", title: "鏡子拼花", sub: "照著左邊的花圃，在鏡子的另一邊種花。", topic: "圖形與測量、規律與推理" }
];

const stalls = [
  ["🍊", "橘子", 3], ["🍙", "飯糰", 7], ["🍮", "布丁", 12], ["🍞", "吐司", 18]
];
const beds = [["10","00"], ["01","10"], ["11","01","10"], ["10","01","11","10"]];

export function renderPlay(game) {
  const host = document.getElementById("view-play");
  const market = game.id === "market";
  const rounds = market ? stalls : beds;
  let stage = 0;
  function start() {
    const coins = [];
    const rows = market ? [] : beds[stage];
    const flowers = rows.map(() => [false, false]);
    const [icon, food, price] = stalls[stage];
    const title = market ? food + "　" + price + " 元" : "種出另一半花圃";
    host.innerHTML = '<a class="back" href="#math">← 回幼兒數學</a><div><h1>' + game.title +
      '</h1><p class="lead">' + game.sub + '</p></div><section class="board pboard"><small>第 ' + (stage + 1) +
      ' 關，共 ' + rounds.length + ' 關</small><h2>' + title + '</h2><div class="play-scene"></div><div class="ctrls" data-tools></div>' +
      '<p role="status"></p><div class="ctrls"><button class="btn primary" data-check>' + (market ? "付錢" : "看看花圃") +
      '</button><button class="btn" data-next hidden></button></div></section>';
    const scene = host.querySelector(".play-scene"), tools = host.querySelector("[data-tools]");
    const feedback = host.querySelector('[role="status"]'), check = host.querySelector("[data-check]"), next = host.querySelector("[data-next]");
    if (market) {
      scene.innerHTML = '<span class="market-food" aria-hidden="true">' + icon + '</span><div class="market-tray"></div><b data-total></b>';
      tools.innerHTML = [1,5,10].map(v => '<button class="btn" data-coin="' + v + '">放 ' + v + ' 元</button>').join("") +
        '<button class="btn" data-undo>拿回一枚</button>';
      const draw = () => {
        scene.querySelector(".market-tray").innerHTML = coins.map(v => '<span class="market-coin">' + v + '</span>').join("") || "托盤是空的";
        const total = coins.reduce((a,b) => a+b, 0);
        scene.querySelector("[data-total]").textContent = "托盤上有 " + total + " 元";
        tools.querySelector("[data-undo]").disabled = !coins.length;
        for (const b of tools.querySelectorAll("[data-coin]")) b.disabled = total >= price;
      };
      tools.onclick = e => {
        const b = e.target.closest("button");
        if (!b || b.disabled) return;
        if (b.hasAttribute("data-undo")) coins.pop();
        else coins.push(Number(b.dataset.coin));
        draw();
        feedback.textContent = "";
      };
      draw();
    } else {
      scene.innerHTML = '<div class="flower-labels"><b>照著看</b><b>在這裡種</b></div><div class="flower-grid">' +
        rows.map((row,r) => [...row].map(v => '<span class="flower-cell" aria-label="' + (v === "1" ? "有花" : "空地") + '">' + (v === "1" ? "🌼" : "·") + '</span>').join("") +
        [0,1].map(c => '<button class="flower-cell" aria-label="第 ' + (r+1) + ' 排，右半邊第 ' + (c+1) + ' 格" aria-pressed="false" data-row="' + r + '" data-col="' + c + '">·</button>').join("")).join("") + '</div>';
      feedback.textContent = "點空地種花，再點一次就能移走。";
      scene.onclick = e => {
        const b = e.target.closest("button");
        if (!b || b.disabled) return;
        const r = Number(b.dataset.row), c = Number(b.dataset.col);
        flowers[r][c] = !flowers[r][c];
        b.setAttribute("aria-pressed", String(flowers[r][c]));
        b.textContent = flowers[r][c] ? "🌼" : "·";
        feedback.textContent = "";
      };
    }
    check.onclick = () => {
      if (market) {
        const difference = price - coins.reduce((a,b) => a+b, 0);
        if (difference) {
          feedback.textContent = difference > 0 ? "還差 " + difference + " 元，再放一枚看看。" : "多了 " + (-difference) + " 元，拿回一枚再試試。";
          return;
        }
      } else {
        const wrongRow = rows.findIndex((row,r) => flowers[r].some((flower,c) => flower !== (row[1-c] === "1")));
        if (wrongRow >= 0) {
          feedback.textContent = "看看第 " + (wrongRow+1) + " 排。兩邊的花要離中線一樣遠。";
          return;
        }
      }
      saveStars("play." + game.id + "." + stage, 1);
      feedback.textContent = market ? "剛剛好！買到" + food + "了。" : "兩邊的花對齊了！";
      for (const b of host.querySelectorAll(".play-scene button, [data-tools] button")) b.disabled = true;
      check.hidden = true;
      next.hidden = false;
      next.textContent = stage + 1 === rounds.length ? "四關完成！再玩一次" : "玩下一關";
      next.focus();
    };
    next.onclick = () => { stage = (stage + 1) % rounds.length; start(); };
  }
  const progress = loadProgress();
  const pending = rounds.findIndex((_, i) => !progress["play." + game.id + "." + i]);
  stage = Math.max(0, pending);
  start();
}
