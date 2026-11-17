// 遊戲音效和背景音樂：全部用 Web Audio 當場合成，不用下載音檔。
// 瀏覽器規定要使用者按過按鈕才能出聲，所以要在按「開始」的時候呼叫 unlock()。
// 開關存在這台裝置（soroban.sound.v1）。
const KEY = "soroban.sound.v1";
let ctx = null, master = null, sfxBus = null, musicBus = null, musicTimer = null, musicStep = 0, nextNoteT = 0;
const lastPlay = {};

export function soundOn() { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } }
export function setSoundOn(on) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* 存不了就算了 */ }
  if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05);
}

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = soundOn() ? 0.9 : 0; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch { ctx = null; }
}

// 一個音：頻率從 f1 滑到 f2
function tone({ type = "square", f1, f2 = f1, t = 0, dur = 0.12, vol = 0.5, bus = sfxBus, attack = 0.005 }) {
  if (!ctx) return;
  const at = ctx.currentTime + t, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, at);
  if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(bus);
  o.start(at); o.stop(at + dur + 0.02);
}
// 一小段雜訊（爆炸、撞擊）
function noise({ t = 0, dur = 0.15, vol = 0.4, freq = 1200 }) {
  if (!ctx) return;
  const at = ctx.currentTime + t, len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; f.type = "lowpass"; f.frequency.value = freq; g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(sfxBus);
  src.start(at);
}

const SOUNDS = {
  arrow: () => tone({ type: "triangle", f1: 900, f2: 500, dur: 0.06, vol: 0.12 }),
  laser: () => tone({ type: "sawtooth", f1: 1400, f2: 300, dur: 0.18, vol: 0.12 }),
  wave: () => { tone({ type: "sine", f1: 160, f2: 60, dur: 0.35, vol: 0.5 }); noise({ dur: 0.25, vol: 0.12, freq: 500 }); },
  bolt: () => { noise({ dur: 0.12, vol: 0.2, freq: 4000 }); tone({ type: "square", f1: 1600, f2: 800, dur: 0.08, vol: 0.08 }); },
  ice: () => { tone({ type: "sine", f1: 2400, dur: 0.08, vol: 0.12 }); tone({ type: "sine", f1: 3200, dur: 0.1, vol: 0.08, t: 0.04 }); },
  special: () => { tone({ type: "square", f1: 300, f2: 1200, dur: 0.18, vol: 0.18 }); noise({ t: 0.15, dur: 0.2, vol: 0.25, freq: 1500 }); },
  kill: () => { tone({ type: "square", f1: 660, f2: 1320, dur: 0.08, vol: 0.14 }); tone({ type: "triangle", f1: 990, dur: 0.08, vol: 0.12, t: 0.06 }); },
  boss: () => { noise({ dur: 0.5, vol: 0.4, freq: 900 }); [523, 659, 784, 1047].forEach((f, i) => tone({ type: "square", f1: f, dur: 0.12, vol: 0.16, t: 0.1 + i * 0.08 })); },
  castle: () => { tone({ type: "sine", f1: 120, f2: 50, dur: 0.3, vol: 0.6 }); noise({ dur: 0.2, vol: 0.3, freq: 400 }); },
  correct: () => { tone({ type: "triangle", f1: 784, dur: 0.1, vol: 0.3 }); tone({ type: "triangle", f1: 1175, dur: 0.16, vol: 0.3, t: 0.08 }); },
  wrong: () => { tone({ type: "square", f1: 220, f2: 160, dur: 0.22, vol: 0.14 }); },
  offer: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ type: "triangle", f1: f, dur: 0.12, vol: 0.22, t: i * 0.06 })),
  upgrade: () => { tone({ type: "square", f1: 523, f2: 1047, dur: 0.2, vol: 0.16 }); tone({ type: "triangle", f1: 1568, dur: 0.25, vol: 0.18, t: 0.12 }); },
  stage: () => [392, 523, 659, 784].forEach((f, i) => tone({ type: "square", f1: f, dur: 0.14, vol: 0.16, t: i * 0.12 })),
  clear: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone({ type: "square", f1: f, dur: i === 5 ? 0.4 : 0.12, vol: 0.18, t: i * 0.11 })),
  win: () => [523, 523, 784, 784, 880, 880, 784, 1047].forEach((f, i) => tone({ type: "square", f1: f, dur: 0.16, vol: 0.18, t: i * 0.15 })),
  lose: () => [392, 370, 349, 262].forEach((f, i) => tone({ type: "triangle", f1: f, dur: 0.3, vol: 0.25, t: i * 0.25 })),
};
// 同一種聲音在 gap 秒內只響一次，怪物很多的時候才不會吵成一團
const GAP = { arrow: 0.09, laser: 0.12, ice: 0.12, bolt: 0.1, wave: 0.2, kill: 0.07, castle: 0.15 };

export function play(name) {
  if (!ctx || !soundOn() || !SOUNDS[name]) return;
  const now = ctx.currentTime;
  if (GAP[name] && lastPlay[name] && now - lastPlay[name] < GAP[name]) return;
  lastPlay[name] = now;
  try { SOUNDS[name](); } catch { /* 出不了聲就算了 */ }
}

/* ---------- 背景音樂：輕快的小調子，一直重複 ---------- */
// 每個數字是一個 8 分音符的音高（0 = 休息）；用 C 大調，簡單好聽
const MELODY = [
  659, 784, 880, 784, 659, 523, 587, 659, 587, 523, 440, 523, 587, 0, 587, 0,
  659, 784, 880, 1047, 880, 784, 659, 587, 659, 784, 659, 587, 523, 0, 523, 0,
];
const BASS = [131, 131, 196, 196, 220, 220, 175, 175, 131, 131, 196, 196, 175, 196, 131, 131];
const BEAT = 0.2;

function schedule() {
  if (!ctx) return;
  while (nextNoteT < ctx.currentTime + 0.5) {
    const i = musicStep % MELODY.length, f = MELODY[i], t = nextNoteT - ctx.currentTime;
    if (f) tone({ type: "square", f1: f, dur: BEAT * 0.85, vol: 0.35, t, bus: musicBus, attack: 0.01 });
    if (i % 2 === 0) tone({ type: "triangle", f1: BASS[(i / 2) % BASS.length], dur: BEAT * 1.8, vol: 0.6, t, bus: musicBus, attack: 0.01 });
    if (i % 4 === 2) noise({ t, dur: 0.05, vol: 0.05, freq: 6000 });
    musicStep++;
    nextNoteT += BEAT;
  }
}
export function startMusic() {
  if (!ctx || musicTimer) return;
  musicStep = 0; nextNoteT = ctx.currentTime + 0.1;
  musicTimer = setInterval(schedule, 120);
  schedule();
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
