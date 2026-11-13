// 1つの対戦(ドラフト → VS → ラウンド進行 → 結果)。バトルのルールは js/engine/ をそのまま使う(サーバー権威)
import { createBattle } from '../js/engine/battle.js';
import { createBot } from '../js/engine/bot.js';
import { createTyper } from '../js/engine/romaji.js';
import { makeQueue } from '../js/engine/feed.js';
import { mulberry32, shuffled } from '../js/engine/rng.js';
import { CHARACTERS, charById } from '../js/data/characters.js';
import { FORMATS } from '../js/data/words.js';
import { RULES } from '../js/engine/rules.js';

const IDS = CHARACTERS.map(c => c.id), FMT_IDS = FORMATS.map(f => f.id);
const SECS = +process.env.TB_DRAFT_SECS || 7;           // BAN/PICKの制限時間
const COUNT_MS = +process.env.TB_COUNTDOWN_MS || 3000;  // 試合開始前のカウントダウン
const ROUND_SECS = +process.env.TB_ROUND_SECS || RULES.DURATION;
const MAX_KEYS_PER_SEC = 16;                            // これを超える打鍵は無視(自動入力対策)
const flip = s => (s === 'p1' ? 'p2' : s === 'p2' ? 'p1' : s);
const pickState = s => ({ hp: s.hp, max: s.max, combo: s.combo, gauge: s.gauge, fx: s.fx });

export class Match {
  constructor({ mode, players, firstTo, onFinish }) {
    Object.assign(this, { mode, players, firstTo, onFinish, phase: 'found', score: [0, 0], roundsLost: [0, 0], timers: new Set(), finished: false, bans: [[], []], si: -1 });
    this.seed = (Math.random() * 2 ** 32) >>> 0; this.rng = mulberry32(this.seed);
    this.fmts = shuffled(FMT_IDS, this.rng).slice(0, 3);
    this.steps = mode === 'ranked' ? ['ban', 'pick', 'format'] : ['pick', 'format'];
    players.forEach((p, i) => {
      Object.assign(p, { idx: i, left: false, ready: !!p.cpu, sub: null, pick: null, pickRandom: false, kw: [], qi: 0, q: [], typer: null, tot: { hits: 0, miss: 0, t: 0, maxCombo: 0, skills: new Set(), minHp: 1 } });
    });
    this.sendAll(i => ({ t: 'found', mode, firstTo, opp: this.info(players[1 - i]) }));
    this.later(() => this.nextStep(), 1700);
  }
  info = p => ({ ign: p.ign, rank: p.rankText, title: p.title });
  later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms); this.timers.add(t); return t; }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers.clear(); clearInterval(this.tickTimer); }
  send(p, obj) { if (p.ws && !p.cpu && !p.left) p.ws.send(JSON.stringify(obj)); }
  sendAll(fn) { this.players.forEach((p, i) => this.send(p, fn(i))); }
  mapScore = i => (i === 0 ? this.score : [this.score[1], this.score[0]]);
  mapEv(i, e) { return i === 0 ? e : { ...e, side: flip(e.side), ...(e.winner ? { winner: flip(e.winner) } : {}) }; }

  // ---- ドラフト ----
  nextStep() {
    if (this.finished) return;
    this.si++; this.step = this.phase = this.steps[this.si]; this.resolving = false;
    this.avail = this.step === 'pick' ? (this.mode === 'ranked' ? IDS.filter(x => !this.bans.flat().includes(x)) : IDS) : null;
    this.players.forEach(p => {
      p.sub = null;
      if (p.cpu) p.sub = this.step === 'ban' ? shuffled(IDS, this.rng).slice(0, 2) : this.step === 'pick' ? [shuffled(this.avail, this.rng)[0]] : [shuffled(this.fmts, this.rng)[0]];
    });
    this.sendAll(i => ({ t: 'phase', step: this.step, secs: SECS, avail: this.avail, fmts: this.step === 'format' ? this.fmts : null, bans: this.step === 'pick' ? { mine: this.bans[i], theirs: this.bans[1 - i] } : null }));
    this.stepTimer = this.later(() => this.resolve(), (SECS + 1) * 1000);
  }
  resolve() {
    if (this.resolving || this.finished) return;
    this.resolving = true; clearTimeout(this.stepTimer); this.timers.delete(this.stepTimer);
    const step = this.step;
    for (const p of this.players) if (!p.sub) {
      if (step === 'ban') p.sub = shuffled(IDS, this.rng).slice(0, 2);
      else if (step === 'pick') { p.sub = [shuffled(this.avail, this.rng)[0]]; p.pickRandom = true; }
      else p.sub = [shuffled(this.fmts, this.rng)[0]];
    }
    if (step === 'ban') {
      this.bans = this.players.map(p => p.sub);
      this.sendAll(i => ({ t: 'ban_result', mine: this.bans[i], theirs: this.bans[1 - i] }));
      this.later(() => this.nextStep(), 1500);
    } else if (step === 'pick') {
      this.players.forEach(p => { p.pick = p.sub[0]; });
      this.sendAll(() => ({ t: 'pick_ok' }));
      this.later(() => this.nextStep(), 1100);
    } else {
      const [f0, f1] = this.players.map(p => p.sub[0]), rest = this.fmts.filter(f => f !== f0 && f !== f1);
      this.final = shuffled(rest, this.rng)[0];
      this.sendAll(i => ({ t: 'fmt_result', mine: this.players[i].sub[0], theirs: this.players[1 - i].sub[0], final: this.final }));
      this.later(() => this.sendVs(), 2000);
    }
  }
  sendVs() {
    this.phase = 'vs';
    this.sendAll(i => ({ t: 'vs', mode: this.mode, firstTo: this.firstTo, format: this.final, me: { char: this.players[i].pick }, foe: { ...this.info(this.players[1 - i]), char: this.players[1 - i].pick } }));
    this.vsTimer = this.later(() => this.startRound(), 3900);
  }

  // ---- ラウンド ----
  startRound() {
    if (this.finished || this.phase === 'count' || this.phase === 'fight') return;
    clearTimeout(this.vsTimer);
    const seed = (Math.random() * 2 ** 32) >>> 0, chars = this.players.map(p => charById(p.pick));
    this.battle = createBattle({ chars, rng: mulberry32(seed), duration: ROUND_SECS });
    this.players.forEach(p => { p.q = makeQueue(this.final, seed); p.qi = 0; this.newWord(p); p.kw = []; });
    const cpu = this.players[1].cpu;
    this.bot = cpu ? createBot({ cpm: cpu.cpm, accuracy: cpu.acc, skillMode: 'ready', rng: mulberry32(seed + 99) }) : null;
    this.phase = 'count';
    this.sendAll(i => ({ t: 'round', n: this.score[0] + this.score[1] + 1, seed, startIn: COUNT_MS, score: this.mapScore(i), limit: ROUND_SECS }));
    this.later(() => {
      if (this.finished) return;
      this.phase = 'fight'; this.last = performance.now();
      this.tickTimer = setInterval(() => this.tick(), 50);
    }, COUNT_MS);
  }
  newWord(p) { const w = p.q[p.qi % p.q.length]; p.typer = createTyper(w.r, !!w.lit); }
  tick() {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    this.bot?.step(dt, this.battle, 'p2');
    this.battle.step(dt);
    this.flush();
    const r = this.battle.result();
    if (r) this.endRound(r);
  }
  flush() {
    const evs = this.battle.drain(), st = this.battle.state();
    for (const e of evs) {
      const p = this.players[e.side === 'p1' ? 0 : 1];
      if (e.type === 'hit') p.tot.maxCombo = Math.max(p.tot.maxCombo, e.combo);
      if (e.type === 'skill') p.tot.skills.add(e.idx);
    }
    this.players.forEach((p, i) => {
      const mine = i === 0 ? 'p1' : 'p2';
      p.tot.minHp = Math.min(p.tot.minHp, st[mine].hp / st[mine].max);
      if (evs.length) this.send(p, { t: 'ev', list: evs.map(e => this.mapEv(i, e)) });
      this.send(p, { t: 'snap', rem: st.remaining, me: pickState(st[mine]), foe: pickState(st[flip(mine)]) });
    });
  }
  endRound(res) {
    clearInterval(this.tickTimer); this.phase = 'between';
    const st = this.battle.state();
    this.players.forEach((p, i) => { const s = st[i === 0 ? 'p1' : 'p2']; p.tot.hits += s.hits; p.tot.miss += s.miss; p.tot.t += st.t; });
    const w = res.winner === 'p1' ? 0 : res.winner === 'p2' ? 1 : null;
    if (w !== null) { this.score[w]++; this.roundsLost[1 - w]++; }
    this.lastReason = res.reason;
    this.sendAll(i => ({ t: 'round_end', winner: i === 0 || res.winner === 'draw' ? res.winner : flip(res.winner), reason: res.reason, score: this.mapScore(i) }));
    if (res.reason === 'surrender' || this.score[0] >= this.firstTo || this.score[1] >= this.firstTo) this.finish(w, res.reason);
    else this.later(() => this.startRound(), 2300);
  }

  // ---- 入力 ----
  onMsg(p, m) {
    if (this.finished) return;
    const ph = this.phase;
    if (m.t === 'ban' && ph === 'ban' && !p.sub && Array.isArray(m.ids) && m.ids.length === 2 && m.ids[0] !== m.ids[1] && m.ids.every(x => IDS.includes(x))) p.sub = m.ids;
    else if (m.t === 'pick' && ph === 'pick' && !p.sub && this.avail.includes(m.id)) p.sub = [m.id];
    else if (m.t === 'fmt' && ph === 'format' && !p.sub && this.fmts.includes(m.id)) p.sub = [m.id];
    else if (m.t === 'ready' && ph === 'vs') { p.ready = true; if (this.players.every(x => x.ready)) this.startRound(); return; }
    else if (ph === 'fight') return this.onBattleMsg(p, m);
    else return;
    if (this.players.every(x => x.sub)) this.resolve();
  }
  onBattleMsg(p, m) {
    const side = p.idx === 0 ? 'p1' : 'p2';
    if (m.t === 'key' && typeof m.c === 'string' && /^[a-z0-9-]$/.test(m.c)) {
      const now = Date.now();
      p.kw = p.kw.filter(t => now - t < 1000);
      if (p.kw.length >= MAX_KEYS_PER_SEC) return;
      p.kw.push(now);
      const r = p.typer.press(m.c);
      if (r === 'miss') this.battle.miss(side);
      else { this.battle.hit(side); if (r === 'done') { p.qi++; this.newWord(p); } }
    } else if (m.t === 'skill' && (m.i === 0 || m.i === 1)) this.battle.skill(side, m.i);
    else if (m.t === 'surrender') { this.battle.surrender(side); this.flush(); this.endRound(this.battle.result()); }
  }

  leave(p) {
    p.left = true;
    if (!this.finished) this.finish(1 - p.idx, 'disconnect', p.idx);
  }
  finish(winnerIdx, reason, leaver = null) {
    if (this.finished) return;
    this.finished = true; this.clearTimers(); this.phase = 'done';
    const stats = this.players.map((p, i) => ({
      win: i === winnerIdx, hits: p.tot.hits, miss: p.tot.miss, cpm: p.tot.t > 0 ? (p.tot.hits / p.tot.t) * 60 : 0, maxCombo: p.tot.maxCombo, minHp: p.tot.minHp,
      skills: p.tot.skills.size, format: this.final, char: p.pick, foeChar: this.players[1 - i].pick, mirror: !!p.pick && p.pick === this.players[1 - i].pick,
      pickRandom: p.pickRandom, mode: this.mode, firstTo: this.firstTo, roundsLost: this.roundsLost[i], lastReason: this.lastReason ?? reason, disconnected: leaver === i,
    }));
    const out = this.onFinish({ match: this, winnerIdx, reason, leaver, stats }) ?? [];
    this.players.forEach((p, i) => this.send(p, { t: 'match_end', win: i === winnerIdx, reason, mode: this.mode, firstTo: this.firstTo, score: this.mapScore(i), stats: { cpm: Math.round(stats[i].cpm), miss: stats[i].miss, hits: stats[i].hits, maxCombo: stats[i].maxCombo }, ...(out[i] ?? {}) }));
  }
}
