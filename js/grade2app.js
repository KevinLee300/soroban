import { units } from "./grade2.js";
import { handAngles } from "./clocklesson.js";
import { loadProgress, saveStars, logSession } from "./storage.js";

const url = (u, i) => "#grade2-" + (u + 6) + "-" + (i + 1);
const key = (u, i) => "grade2." + (u + 6) + "." + (i + 1);

function diagram(picture) {
  if (!picture) return "";
  let art, label;
  if (picture.time) {
    const [h, m] = picture.time;
    const { ha, ma } = handAngles(h, m);
    label = h + " 時 " + m + " 分的鐘面";
    art = Array.from({ length: 60 }, (_, i) => {
      const a = i * Math.PI / 30;
      const tick = '<path d="M120 7v' + (i % 5 ? 3 : 6) + '" stroke="currentColor" transform="rotate(' + i * 6 + ' 120 68)"/>';
      return tick + (i % 5 ? "" : '<text x="' + (120 + 47 * Math.sin(a)) + '" y="' + (72 - 47 * Math.cos(a)) + '">' + (i / 5 || 12) + '</text>');
    }).join("") + '<path d="M120 68v-30" stroke="var(--minus)" stroke-width="5" transform="rotate(' + ha + ' 120 68)"/><path d="M120 68v-48" stroke="var(--plus)" stroke-width="3" transform="rotate(' + ma + ' 120 68)"/>';
  } else if (picture.rows) {
    label = "有 " + picture.rows + " 排，每排 " + picture.count + " 顆珠子";
    art = Array.from({ length: picture.rows * picture.count }, (_, i) =>
      '<circle fill="var(--plus)" cx="' + (120 + ((i % picture.count) - (picture.count - 1) / 2) * 23) + '" cy="' + (35 + Math.floor(i / picture.count) * 32) + '" r="9"/>').join("");
  } else {
    const diagrams = {
      triangle: ["三條邊和三個頂點", '<polygon points="120,16 64,113 176,113"/><circle cx="120" cy="16" r="4"/><circle cx="64" cy="113" r="4"/><circle cx="176" cy="113" r="4"/>'],
      family: ["從左到右是正三角形、正方形、長方形", '<polygon points="40,38 13,85 67,85"/><rect x="85" y="38" width="48" height="48"/><rect x="151" y="50" width="76" height="36"/>'],
      border: ["線框分出內部、周界和外部", '<rect x="18" y="25" width="136" height="85"/><text x="80" y="70">內部</text><text x="198" y="70">外部</text><text x="80" y="130">↑ 周界</text>'],
      perimeter: ["長方形的長邊 4 公分，短邊 2 公分", '<rect x="40" y="40" width="120" height="60"/><text x="100" y="30">4 公分</text><text x="196" y="75">2 公分</text>']
    };
    [label, art] = diagrams[picture.shape];
  }
  return '<svg viewBox="0 0 240 140" width="240" style="max-width:100%;align-self:center" role="img" aria-label="' + label + '" fill="var(--plus-soft)" stroke="var(--plus)" stroke-width="2"><g text-anchor="middle">' + art.replaceAll("<text ", '<text stroke="none" fill="currentColor" ') + '</g></svg>';
}

export function renderGrade2(unitNumber, lessonNumber) {
  const host = document.getElementById("view-grade2");
  const u = Number(unitNumber) - 6, i = Number(lessonNumber) - 1;
  const unit = units[u], item = unit?.lessons[i];
  if (!item) {
    const progress = loadProgress();
    host.innerHTML = '<a class="back" href="#home">← 回首頁</a><h1>二上數學教室</h1>' + units.map((unit, u) =>
      '<section class="board pboard"><h2>第 ' + (u + 6) + ' 單元　' + unit.title + '</h2><div class="ctrls">' +
      unit.lessons.map((item, i) => '<a class="btn" href="' + url(u, i) + '">' + item.title + (progress[key(u,i)] ? " ✓" : "") + '</a>').join("") + '</div></section>').join("");
    return;
  }
  const started = Date.now();
  let missed = false, done = false;
  host.innerHTML = '<a class="back" href="#grade2">← 選小課</a><div><p class="tip">第 ' + unitNumber + ' 單元　' + unit.title + '</p><h1>' + item.title +
    '</h1></div><section class="board pboard"><h2>一起看例子</h2>' + diagram(item.picture) +
    '<ol>' + item.steps.map(s => '<li>' + s + '</li>').join("") + '</ol></section><section class="board pboard"><h2>換你試試</h2><p>' +
    item.question + '</p><div class="ctrls" data-choices>' + item.choices.map(c => '<button class="btn">' + c + '</button>').join("") +
    '</div><div role="status"></div><a class="btn" data-next hidden></a></section>';
  const choices = host.querySelector("[data-choices]");
  choices.onclick = event => {
    const button = event.target.closest("button");
    if (!button || done) return;
    const feedback = host.querySelector('[role="status"]');
    if (button.textContent !== item.answer) {
      missed = true;
      button.disabled = true;
      feedback.textContent = item.hint + " 再試一次。";
      return;
    }
    done = true;
    feedback.textContent = "答對了！" + item.why;
    for (const option of choices.children) option.disabled = true;
    saveStars(key(u,i), 1);
    logSession({ id: key(u,i), label: item.title, correct: missed ? 0 : 1, total: 1, sec: (Date.now() - started) / 1000 });
    const next = host.querySelector("[data-next]");
    next.href = unit.lessons[i + 1] ? url(u,i + 1) : "#grade2";
    next.textContent = unit.lessons[i + 1] ? "下一小課 →" : "回去選小課";
    next.hidden = false;
    next.focus();
  };
}
