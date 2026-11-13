// サウンド: 音声ファイルは使わず、WebAudioで効果音とBGMをその場で生成する。音量は設定のBGM/効果音に連動
import { store } from './state.js';

let ctx = null, sfxBus = null, bgmBus = null, scene = null, want = null, timer = 0, step = 0, nextT = 0;
const midi = m => 440 * 2 ** ((m - 69) / 12);

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  sfxBus = ctx.createGain(); bgmBus = ctx.createGain();
  sfxBus.connect(comp); bgmBus.connect(comp); comp.connect(ctx.destination);
  applyVolume();
  return ctx;
}
export function applyVolume() {
  if (!ctx) return;
  const s = store.get().settings;
  sfxBus.gain.value = (s.se / 100) ** 1.5 * 0.9;
  bgmBus.gain.value = (s.bgm / 100) ** 1.5 * 0.4;
}
export function unlockAudio() { if (ensure()) { ctx.resume(); if (want && !scene) playBgm(want); } }

const tone = (f, { type = 'square', dur = 0.1, vol = 0.2, slide = 0, when = 0, bus = 'sfx' } = {}) => {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus === 'sfx' ? sfxBus : bgmBus); o.start(t); o.stop(t + dur + 0.02);
};
let noiseBuf = null;
const noise = ({ dur = 0.1, vol = 0.2, hp = 800, when = 0, bus = 'sfx' } = {}) => {
  if (!ctx || ctx.state !== 'running') return;
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus === 'sfx' ? sfxBus : bgmBus); s.start(t); s.stop(t + dur + 0.02);
};
const arp = (notes, gap, o) => notes.forEach((n, i) => tone(n, { ...o, when: i * gap }));

const SFX = {
  key: () => tone(1250, { type: 'triangle', dur: 0.03, vol: 0.05 }),
  miss: () => tone(140, { type: 'sawtooth', dur: 0.16, vol: 0.16, slide: -70 }),
  hurt: () => tone(170, { type: 'sine', dur: 0.09, vol: 0.14, slide: -80 }),
  crit: () => { noise({ dur: 0.14, vol: 0.18, hp: 1800 }); tone(760, { type: 'sawtooth', dur: 0.2, vol: 0.14, slide: -460 }); },
  skill: () => { tone(280, { type: 'sawtooth', dur: 0.38, vol: 0.15, slide: 900 }); arp([523, 659, 784], 0.07, { type: 'triangle', dur: 0.3, vol: 0.14, when: 0 }); },
  combo: () => arp([523, 659, 784, 1047], 0.06, { type: 'square', dur: 0.12, vol: 0.09 }),
  heal: () => arp([1175, 1568, 2093], 0.07, { type: 'triangle', dur: 0.2, vol: 0.1 }),
  ko: () => { noise({ dur: 0.6, vol: 0.32, hp: 200 }); tone(95, { type: 'sawtooth', dur: 0.7, vol: 0.25, slide: -60 }); },
  count: () => tone(440, { dur: 0.16, vol: 0.14 }),
  go: () => { tone(880, { dur: 0.4, vol: 0.16 }); tone(1320, { type: 'triangle', dur: 0.4, vol: 0.1 }); },
  win: () => arp([523, 659, 784, 1047, 1319], 0.13, { type: 'square', dur: 0.28, vol: 0.12 }),
  lose: () => arp([392, 349, 311, 262], 0.22, { type: 'triangle', dur: 0.4, vol: 0.18 }),
  ui_move: () => tone(660, { dur: 0.035, vol: 0.05 }),
  ui_ok: () => arp([880, 1320], 0.06, { dur: 0.08, vol: 0.09 }),
  ui_back: () => tone(440, { dur: 0.1, vol: 0.08, slide: -120 }),
  ban: () => { tone(110, { type: 'square', dur: 0.2, vol: 0.2, slide: -60 }); noise({ dur: 0.08, vol: 0.12, hp: 500 }); },
  pick: () => arp([988, 1319], 0.07, { type: 'triangle', dur: 0.2, vol: 0.13 }),
  tick: () => tone(1000, { dur: 0.03, vol: 0.09 }),
  found: () => arp([523, 659, 784, 988], 0.09, { type: 'square', dur: 0.16, vol: 0.1 }),
  vs: () => { tone(120, { type: 'sawtooth', dur: 0.6, vol: 0.2, slide: 200 }); noise({ dur: 0.3, vol: 0.2, hp: 400 }); },
};
export const sfx = name => { try { SFX[name]?.(); } catch { /* 音が出なくても進行に影響させない */ } };

// ---- BGM(コード進行からその場で演奏) ----
const SONGS = {
  menu: { bpm: 92, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass: [45, 41, 36, 43], drive: false },
  battle: { bpm: 156, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], bass: [45, 41, 43, 40], drive: true },
};
function playStep(song, i, t) {
  const bar = Math.floor(i / 16) % 4, s = i % 16, ch = song.chords[bar], at = t - ctx.currentTime;
  const T = (f, o) => tone(f, { ...o, bus: 'bgm', when: at });
  if (!song.drive) {
    if (s % 8 === 0) T(midi(song.bass[bar]), { type: 'triangle', dur: 0.8, vol: 0.55 });
    if ([0, 3, 6, 8, 11, 14].includes(s)) T(midi(ch[(s * 7) % 3] + 12), { type: 'triangle', dur: 0.3, vol: 0.2 });
    if (s === 0 || s === 8) T(62, { type: 'sine', dur: 0.14, vol: 0.4, slide: -30 });
    if (s % 4 === 2) noise({ dur: 0.03, vol: 0.04, hp: 7000, bus: 'bgm', when: at });
  } else {
    if (s % 2 === 0) T(midi(song.bass[bar] + (s % 4 === 2 ? 12 : 0)), { type: 'sawtooth', dur: 0.12, vol: 0.26 });
    T(midi(ch[s % 3] + 12 * (1 + ((s >> 3) & 1))), { type: 'square', dur: 0.07, vol: 0.075 });
    if (s % 8 === 0 || s === 6) T(64, { type: 'sine', dur: 0.13, vol: 0.5, slide: -35 });
    if (s === 4 || s === 12) noise({ dur: 0.12, vol: 0.22, hp: 1500, bus: 'bgm', when: at });
    if (s % 2 === 1) noise({ dur: 0.02, vol: 0.05, hp: 8000, bus: 'bgm', when: at });
  }
}
function pump() {
  const song = SONGS[scene], dur = 60 / song.bpm / 4;
  while (nextT < ctx.currentTime + 0.18) { playStep(song, step++, nextT); nextT += dur; }
}
function playBgm(name) {
  want = name;
  if (!ctx || ctx.state !== 'running') return;
  clearInterval(timer); scene = name; step = 0; nextT = ctx.currentTime + 0.1;
  timer = setInterval(pump, 30);
}
export function stopBgm() { want = null; scene = null; clearInterval(timer); }

const sceneFor = screen => (screen === 'battle' ? 'battle' : screen === 'vs' || screen === 'result' ? null : 'menu');
export function initAudio() {
  const go = () => unlockAudio();
  addEventListener('pointerdown', go); addEventListener('keydown', go);
  let lastScreen = store.get().screen, lastVol = '';
  want = sceneFor(lastScreen);
  store.subscribe(s => {
    if (s.screen !== lastScreen) { lastScreen = s.screen; const w = sceneFor(s.screen); if (w !== scene) { w ? playBgm(w) : stopBgm(); } }
    const v = `${s.settings.bgm}/${s.settings.se}`; if (v !== lastVol) { lastVol = v; applyVolume(); }
  });
}
