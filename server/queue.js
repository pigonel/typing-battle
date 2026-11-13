// マッチング待ち行列。ランク: 待ち時間に応じて範囲が広がる / 通常: 20秒で見つからなければCPU戦
import { compatible } from './rank.js';
export const CPU_WAIT_SEC = +process.env.TB_CPU_WAIT_SEC || 20;

export class Matchmaker {
  constructor({ createMatch, createCpuMatch }) { Object.assign(this, { createMatch, createCpuMatch, list: [] }); }
  start() { this.timer = setInterval(() => this.run(), 500); this.timer.unref?.(); }
  add(entry) { this.remove(entry.c); this.list.push({ ...entry, since: Date.now() }); }
  remove(c) { this.list = this.list.filter(e => e.c !== c); }
  has(c) { return this.list.some(e => e.c === c); }
  run() {
    const now = Date.now(), sec = e => (now - e.since) / 1000;
    for (const mode of ['ranked', 'normal']) {
      const q = this.list.filter(e => e.mode === mode).sort((a, b) => a.since - b.since), used = new Set();
      for (let i = 0; i < q.length; i++) {
        if (used.has(q[i])) continue;
        for (let j = i + 1; j < q.length; j++) {
          const a = q[i], b = q[j];
          if (used.has(b) || (a.c.user && a.c.user === b.c.user)) continue;
          const w = Math.max(sec(a), sec(b));
          const ok = mode === 'ranked' ? compatible(a.rank, b.rank, w) : Math.abs(a.rank.mmr - b.rank.mmr) <= 150 + 25 * w;
          if (ok) { used.add(a); used.add(b); this.remove(a.c); this.remove(b.c); this.createMatch(mode, a, b); break; }
        }
        if (!used.has(q[i]) && mode === 'normal' && sec(q[i]) >= CPU_WAIT_SEC) { used.add(q[i]); this.remove(q[i].c); this.createCpuMatch(q[i]); }
      }
    }
  }
}
