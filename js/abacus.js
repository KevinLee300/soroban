// 可重複使用的算盤元件（SVG）。支援多檔，檔位 0 = 個位（最右邊）。
// createAbacus(host, { rods, interactive, onChange }) → { setValue, value, highlight, el }
const NS = "http://www.w3.org/2000/svg";
const BEAD = "M-56,0 C-50,-15 -28,-17 0,-17 C28,-17 50,-15 56,0 C50,15 28,17 0,17 C-28,17 -50,15 -56,0 Z";
const COL = 160; // 每檔寬度

export function createAbacus(host, { rods = 1, interactive = false, onChange } = {}) {
  const W = 36 + COL * rods;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} 400`);
  svg.setAttribute("class", "abacus" + (interactive ? " interactive" : ""));
  svg.setAttribute("role", "img");
  svg.style.setProperty("--rods", rods);
  let html = "";
  const cx = (r) => 18 + COL / 2 + COL * (rods - 1 - r);
  for (let r = 0; r < rods; r++) html += `<line class="rod" x1="${cx(r)}" y1="28" x2="${cx(r)}" y2="372"/>`;
  html += `<rect class="frame" x="9" y="9" width="${W - 18}" height="382" rx="10"/>
    <rect class="frame-in" x="18" y="18" width="${W - 36}" height="364" rx="4"/>
    <rect class="beam" x="18" y="120" width="${W - 36}" height="20"/>`;
  for (let r = 0; r < rods; r++) html += `<circle class="dot" cx="${cx(r)}" cy="130" r="3.5"/>`;
  svg.innerHTML = html;

  const beads = {};
  const make = (key) => {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "bead");
    g.dataset.key = key;
    g.innerHTML = `<path class="halo" d="${BEAD}"/><path class="body" d="${BEAD}"/><ellipse class="shine" cx="-14" cy="-7" rx="24" ry="4"/>`;
    svg.appendChild(g);
    beads[key] = g;
  };
  for (let r = 0; r < rods; r++) { make(`r${r}-h`); for (let i = 0; i < 4; i++) make(`r${r}-e${i}`); }
  host.appendChild(svg);

  let st = Array.from({ length: rods }, () => ({ h: false, e: 0 }));

  function value() { return st.reduce((s, d, r) => s + (d.h * 5 + d.e) * 10 ** r, 0); }
  function place() {
    for (let r = 0; r < rods; r++) {
      const x = cx(r);
      beads[`r${r}-h`].style.transform = `translate(${x}px,${st[r].h ? 102 : 46}px)`;
      for (let i = 0; i < 4; i++) {
        const up = i < st[r].e;
        beads[`r${r}-e${i}`].style.transform = `translate(${x}px,${(up ? 158 : 246) + 36 * i}px)`;
      }
    }
    svg.setAttribute("aria-label", "算盤上的數字是 " + value());
  }
  function setValue(v) {
    st = st.map((_, r) => { const d = Math.floor(v / 10 ** r) % 10; return { h: d >= 5, e: d % 5 }; });
    place();
  }

  if (interactive) {
    svg.addEventListener("click", (ev) => {
      const g = ev.target.closest(".bead");
      if (!g) return;
      const [, r, kind, i] = g.dataset.key.match(/^r(\d+)-(h|e)(\d?)$/);
      const d = st[+r];
      if (kind === "h") d.h = !d.h;
      else d.e = +i < d.e ? +i : +i + 1;
      place();
      onChange && onChange(value());
    });
  }
  place();

  return {
    el: svg,
    setValue,
    value,
    highlight(keys) { for (const [k, g] of Object.entries(beads)) g.classList.toggle("hl", keys.includes(k)); },
  };
}
