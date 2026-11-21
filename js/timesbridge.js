import { BRIDGE_COUNT, BRIDGE_PIECES, bridgeBuild, makeBridge } from "./times.js";

const $ = (id) => document.getElementById(id);
let level, bridge, pieces, crossed;

export function renderBridge() {
  level = 0;
  $("bridgePieces").innerHTML = BRIDGE_PIECES.map((piece) =>
    `<button class="btn" type="button" data-piece="${piece}">${piece} 排</button>`).join("");
  $("bridgePieces").onclick = (event) => {
    const button = event.target.closest("[data-piece]");
    if (!button || crossed || pieces.length === 2) return;
    pieces.push(Number(button.dataset.piece));
    drawBridge();
  };
  $("bridgeUndo").onclick = () => {
    if (crossed || !pieces.length) return;
    pieces.pop();
    drawBridge();
  };
  $("bridgeCheck").onclick = () => {
    if (crossed) {
      level = (level + 1) % BRIDGE_COUNT;
      openBridge();
    } else if (bridgeBuild(bridge, pieces).ready) {
      crossed = true;
      drawBridge();
    }
  };
  openBridge();
}

function openBridge() {
  bridge = makeBridge(level);
  pieces = [];
  crossed = false;
  $("bridgeProgress").textContent = `第 ${level + 1} / ${BRIDGE_COUNT} 座橋`;
  $("bridgeName").textContent = bridge.name;
  $("bridgeGoal").textContent = `橋要接 ${bridge.rows} 排，每排 ${bridge.width} 塊。`;
  $("bridgeAnimal").textContent = bridge.animal;
  drawBridge();
}

function drawBridge() {
  const { rows, width } = bridge;
  const { remaining, ready, blocks } = bridgeBuild(bridge, pieces);
  const river = $("bridgeRiver"), deck = $("bridgeDeck");
  river.classList.toggle("crossed", crossed);
  river.setAttribute("aria-label", `橋板已接 ${Math.min(rows, rows - remaining)} 排，每排 ${width} 塊，需要 ${rows} 排。`);
  deck.style.setProperty("--bridge-rows", rows);
  deck.innerHTML = Array.from({ length: rows }, (_, i) => {
    const part = i < (pieces[0] || 0) ? "first" : i < rows - remaining ? "second" : "missing";
    return `<div class="bridge-row ${part}">${"<span></span>".repeat(width)}</div>`;
  }).join("");
  $("bridgeFormula").textContent = crossed
    ? `${rows} × ${width} = ${blocks.join(" + ")} = ${rows * width}`
    : pieces.map((piece, i) => `${piece} × ${width} = ${blocks[i]}`).join("　＋　");
  const last = level + 1 === BRIDGE_COUNT;
  $("bridgeNotice").textContent = crossed ? (last ? "六座橋都修好了！" : "小動物過橋囉！")
    : remaining < 0 ? `多了 ${-remaining} 排，拆掉最後一段再試試。`
    : remaining > 0 ? `還差 ${remaining} 排。`
    : ready ? "橋接好了，可以過河了。" : "剛好接滿了，試試看用兩段拼起來。";
  for (const button of $("bridgePieces").querySelectorAll("button")) {
    button.setAttribute("aria-disabled", String(crossed || pieces.length === 2));
  }
  $("bridgeUndo").setAttribute("aria-disabled", String(crossed || !pieces.length));
  $("bridgeCheck").setAttribute("aria-disabled", String(!crossed && !ready));
  $("bridgeCheck").textContent = crossed ? (last ? "再修一輪" : "下一座橋") : "讓小動物過橋";
}
