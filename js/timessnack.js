import { SNACK_ORDERS, nearbySizes, snackPacking } from "./times.js";

const $ = (id) => document.getElementById(id);
let index, order, boxSize, packed, sent;

export function renderSnack() {
  index = 0;
  $("snackSizes").onclick = (event) => {
    const button = event.target.closest("[data-size]");
    if (!button || packed || sent) return;
    boxSize = Number(button.dataset.size);
    drawCounter();
  };
  $("snackPack").onclick = () => {
    if (sent || !snackPacking(order, boxSize, packed).canPack) return;
    packed++;
    drawCounter();
  };
  $("snackUndo").onclick = () => {
    if (!packed || sent) return;
    packed--;
    drawCounter();
  };
  $("snackSend").onclick = () => {
    if (sent) {
      index = (index + 1) % SNACK_ORDERS.length;
      openOrder();
    } else if (snackPacking(order, boxSize, packed).ready) {
      sent = true;
      drawCounter();
    }
  };
  openOrder();
}

function openOrder() {
  order = SNACK_ORDERS[index];
  boxSize = 0;
  packed = 0;
  sent = false;
  $("snackName").textContent = order.name;
  $("snackProgress").textContent = `第 ${index + 1} / ${SNACK_ORDERS.length} 張訂單`;
  $("snackGoal").textContent = `有 ${order.total} 個點心。每盒裝 ${order.perBox} 個，要用幾盒？`;
  $("snackSizes").innerHTML = nearbySizes(order.perBox).map((n) =>
    `<button class="btn" type="button" data-size="${n}">每盒 ${n} 個</button>`).join("");
  drawCounter();
}

function drawCounter() {
  const { total, perBox, icon } = order;
  const { remaining, canPack, ready } = snackPacking(order, boxSize, packed);
  const boxTreats = `<span aria-hidden="true">${icon}</span>`.repeat(perBox);
  $("snackRemaining").textContent = `待裝 ${remaining} 個`;
  $("snackPacked").textContent = `已裝 ${packed} 盒`;
  $("snackStock").innerHTML = `<span>${icon}</span>`.repeat(remaining)
    + '<span class="used"></span>'.repeat(total - remaining);
  $("snackBoxes").innerHTML = `<div class="snack-box" role="img" aria-label="一盒 ${perBox} 個">${boxTreats}</div>`.repeat(packed);
  for (const button of $("snackSizes").children) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.size) === boxSize));
    button.setAttribute("aria-disabled", String(packed > 0 || sent));
  }
  $("snackPack").setAttribute("aria-disabled", String(sent || !canPack));
  $("snackUndo").setAttribute("aria-disabled", String(sent || packed === 0));
  $("snackSend").setAttribute("aria-disabled", String(!sent && !ready));
  const last = index + 1 === SNACK_ORDERS.length;
  $("snackSend").textContent = sent ? (last ? "再開一輪" : "下一張訂單") : "送出訂單";
  $("snackNotice").textContent = sent
    ? `${last ? "六張訂單都出貨了！" : "出貨成功！"}${total} ÷ ${perBox} = ${packed}，用了 ${packed} 盒。`
    : ready ? `全部裝好了，共 ${packed} 盒。`
    : canPack ? `已裝 ${packed} 盒，還剩 ${remaining} 個。`
    : boxSize ? `這張訂單要用每盒 ${perBox} 個的盒子。` : "先選一種盒子。";
}
