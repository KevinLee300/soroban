// 零錢盒：排法和算盤一樣，和算盤一起動，幫小朋友把珠子想成硬幣。
// 個位：上面 1 格放 5 元、下面 4 格放 1 元；十位：上面放 50 元、下面放 10 元。
// 硬幣是自己畫的簡單圓形，只標面額，不是真的錢幣圖案。
import { COINS } from "./logic.js";

const NS = "http://www.w3.org/2000/svg";
const COL = 110;

export function createCoinTray(host, { rods = 1 } = {}) {
  const W = 20 + COL * rods;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} 400`);
  svg.setAttribute("class", "coins");
  svg.setAttribute("role", "img");
  svg.style.setProperty("--rods", rods);
  let html = `<rect class="tray" x="4" y="4" width="${W - 8}" height="392" rx="14"/>
    <rect class="tray-bar" x="4" y="120" width="${W - 8}" height="20"/>`;
  const slots = {};
  const cx = (r) => 10 + COL / 2 + COL * (rods - 1 - r);
  const coin = (key, x, y, rad, value, kind) => {
    html += `<circle class="slot" cx="${x}" cy="${y}" r="${rad}"/>
      <g class="coin ${kind} off" data-key="${key}" style="transform-origin:${x}px ${y}px">
        <circle class="halo" cx="${x}" cy="${y}" r="${rad + 5}"/>
        <circle class="face" cx="${x}" cy="${y}" r="${rad}"/>
        <circle class="rim" cx="${x}" cy="${y}" r="${rad - 5}"/>
        <text x="${x}" y="${y + 1}" class="amt ${String(value).length > 1 ? "two" : ""}">${value}</text>
      </g>`;
  };
  for (let r = 0; r < rods; r++) {
    const c = COINS[r], x = cx(r);
    coin(`r${r}-h`, x, 72, r ? 36 : 33, c.big, r ? "gold" : "silver");
    for (let i = 0; i < 4; i++) coin(`r${r}-e${i}`, x, 172 + 56 * i, r ? 26 : 23, c.small, r ? "silver" : "gold");
  }
  svg.innerHTML = html;
  svg.querySelectorAll(".coin").forEach((g) => { slots[g.dataset.key] = g; });
  host.appendChild(svg);

  return {
    el: svg,
    setValue(v) {
      for (let r = 0; r < rods; r++) {
        const d = Math.floor(v / 10 ** r) % 10;
        slots[`r${r}-h`].classList.toggle("off", d < 5);
        for (let i = 0; i < 4; i++) slots[`r${r}-e${i}`].classList.toggle("off", i >= d % 5);
      }
      svg.setAttribute("aria-label", `零錢盒裡有 ${v} 元`);
    },
    highlight(keys) { for (const [k, g] of Object.entries(slots)) g.classList.toggle("hl", keys.includes(k)); },
  };
}
