import { GARDEN_PLOTS, gardenHint, gardenWater, makeGardenPlot } from "./times.js";

const $ = (id) => document.getElementById(id);
const G = { index: 0, plot: null, rows: 1, cols: 1, planted: false };

export function startGarden() {
  G.index = 0;
  $("gardenTools").onclick = (event) => {
    const button = event.target.closest("button");
    if (!button || button.getAttribute("aria-disabled") === "true") return;
    G[button.dataset.axis] += Number(button.dataset.delta);
    $("gardenNotice").textContent = "";
    renderBed();
  };
  $("gardenTurn").onclick = () => {
    if (G.planted || G.rows === G.cols) return;
    [G.rows, G.cols] = [G.cols, G.rows];
    $("gardenNotice").textContent = "";
    renderBed();
  };
  $("gardenPlant").onclick = plant;
  openPlot();
}

function openPlot() {
  G.plot = makeGardenPlot(G.index);
  G.rows = 1;
  G.cols = 1;
  G.planted = false;
  const { name, a, b, p, clue, pond } = G.plot;
  $("gardenName").textContent = name;
  $("gardenGoal").textContent = clue === "layout" ? `種 ${a} 排，每排 ${b} 朵。`
    : clue === "rows" ? `種 ${a} 排，一共要 ${p} 朵。` : `種出 ${p} 朵花，留出池塘。`;
  $("gardenNotice").textContent = "";
  $("gardenPondKey").hidden = !pond;
  $("gardenPlant").textContent = "種下這片花";
  renderPath();
  renderBed();
}

function renderPath() {
  $("gardenPath").innerHTML = GARDEN_PLOTS.map(({ name }, i) => {
    const done = i < G.index || (i === G.index && G.planted);
    return `<li${i === G.index ? ' aria-current="step"' : ""} class="${done ? "bloomed" : ""}" aria-label="${name}${done ? "，已開花" : ""}">${done ? "✿" : i + 1}</li>`;
  }).join("");
}

function renderBed() {
  const { plot, rows, cols, planted } = G, { size } = plot;
  const bed = $("gardenBed");
  bed.style.setProperty("--garden-size", size);
  bed.classList.toggle("bloomed", planted);
  const pond = plot.pond ? `。從第 ${plot.pond[0] + 1} 排、第 ${plot.pond[1] + 1} 格起，右下角是池塘` : "";
  bed.setAttribute("aria-label", `${plot.name}，${rows} 排，每排 ${cols} 格${pond}`);
  bed.innerHTML = Array.from({ length: size * size }, (_, i) => {
    const r = Math.floor(i / size) + 1, c = i % size + 1;
    const water = gardenWater(plot, r, c), selected = r <= rows && c <= cols;
    return `<span class="${water ? "pond" : ""} ${selected ? "sown" : ""}" aria-hidden="true">${selected && !water ? "✿" : ""}</span>`;
  }).join("");
  $("gardenRows").textContent = rows;
  $("gardenCols").textContent = cols;
  $("gardenCount").textContent = `${rows} × ${cols} = ${rows * cols} 朵`;
  $("gardenTurn").setAttribute("aria-disabled", String(planted || rows === cols));
  for (const button of $("gardenTools").querySelectorAll("button")) {
    const next = G[button.dataset.axis] + Number(button.dataset.delta);
    button.setAttribute("aria-disabled", String(planted || next < 1 || next > size));
  }
}

function plant() {
  if (G.planted) {
    if (G.index === GARDEN_PLOTS.length - 1) return startGarden();
    G.index++;
    openPlot();
    return;
  }
  const hint = gardenHint(G.plot, G.rows, G.cols);
  $("gardenNotice").textContent = hint;
  if (hint) return;
  G.planted = true;
  const last = G.index === GARDEN_PLOTS.length - 1;
  $("gardenNotice").textContent = last ? "六座花圃都開花了！" : "開花了！去下一座花圃吧。";
  $("gardenPlant").textContent = last ? "再種一輪" : "下一座花圃";
  renderPath();
  renderBed();
}
