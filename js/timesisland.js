import { ISLAND_TRAILS, jumpLandings, nearbySizes } from "./times.js";

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const HOP_MS = 420;
let level, trail, target, limit, step, timer, running, won;

export function leaveIsland() {
  clearTimeout(timer);
  running = false;
}

export function renderIsland() {
  level = 0;
  $("jumpChoices").onclick = (event) => {
    const button = event.target.closest("[data-step]");
    if (button && !running && !won) startJump(Number(button.dataset.step));
  };
  $("jumpNext").onclick = () => {
    if (!won) return;
    level = (level + 1) % ISLAND_TRAILS.length;
    openTrail();
  };
  openTrail();
}

function openTrail() {
  leaveIsland();
  trail = ISLAND_TRAILS[level];
  target = trail.step * trail.hops;
  limit = (trail.step + 1) * trail.hops;
  step = 0;
  won = false;
  $("jumpName").textContent = trail.name;
  $("jumpProgress").textContent = `第 ${level + 1} / ${ISLAND_TRAILS.length} 座島`;
  $("jumpGoal").textContent = `寶箱在第 ${target} 格。每次跳一樣遠，第 ${trail.hops} 跳要剛好到！`;
  $("jumpTicks").innerHTML = "<span></span>".repeat(limit + 1);
  $("jumpChest").style.left = position(target);
  $("jumpChoices").innerHTML = nearbySizes(trail.step).map((n) =>
    `<button class="btn" type="button" data-step="${n}" aria-label="每次跳 ${n} 格">${n} 格</button>`).join("");
  $("jumpNext").hidden = true;
  $("jumpNotice").textContent = "選一個跳法，幫青蛙出發。";
  resetTrack();
  updateChoices();
}

const position = (place) => `${place / limit * 100}%`;

function resetTrack() {
  $("jumpRunner").classList.remove("hopping");
  $("jumpMap").classList.remove("found");
  $("jumpMap").setAttribute("aria-label", `青蛙在第 0 格，寶箱在第 ${target} 格。`);
  $("jumpRunner").style.left = position(0);
  $("jumpTrace").innerHTML = "<li>起點 0</li>";
}

function updateChoices() {
  for (const button of $("jumpChoices").children) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.step) === step));
    button.setAttribute("aria-disabled", String(running || won));
  }
}

function startJump(size) {
  step = size;
  running = true;
  resetTrack();
  updateChoices();
  $("jumpNotice").textContent = `每次跳 ${step} 格。`;
  const landings = jumpLandings(step, trail.hops);
  timer = setTimeout(() => hop(landings, 0), 70);
}

function hop(landings, index) {
  const place = landings[index];
  $("jumpRunner").classList.add("hopping");
  $("jumpRunner").style.left = position(place);
  if (!reduceMotion.matches) {
    $("jumpFrog").animate?.([{ transform: "translateY(0)" }, { transform: "translateY(-15px)" }, { transform: "translateY(0)" }], { duration: 350 });
  }
  timer = setTimeout(() => {
    const tile = document.createElement("li");
    tile.textContent = place;
    $("jumpTrace").append(tile);
    $("jumpMap").setAttribute("aria-label", `青蛙在第 ${place} 格，寶箱在第 ${target} 格。`);
    if (index + 1 < landings.length) hop(landings, index + 1);
    else finishJump(place);
  }, HOP_MS);
}

function finishJump(place) {
  running = false;
  won = place === target;
  const last = level + 1 === ISLAND_TRAILS.length;
  $("jumpMap").classList.toggle("found", won);
  $("jumpNext").hidden = !won;
  $("jumpNext").textContent = last ? "再探險一次" : "去下一座島";
  $("jumpNotice").textContent = won
    ? `${last ? "六座島都找到寶箱了！" : "跳到寶箱了！"}${trail.hops} × ${step} = ${target}。`
    : `停在第 ${place} 格，${place < target ? "還差" : "多跳了"} ${Math.abs(target - place)} 格。換個跳法再試試。`;
  updateChoices();
}
