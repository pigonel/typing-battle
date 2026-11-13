// バランス確認: 全キャラ総当たりをCPU同士で多数回シミュレーションする
//   node tools/sim.mjs [CPM=300] [正確率=0.97] [回数=300]
import { CHARACTERS as C0 } from '../js/data/characters.js';
const HPX = Number(process.env.HPX || 1); // 全キャラのHPを一律に倍率調整して試す
const C = C0.map(c => ({ ...c, hp: Math.round(c.hp * HPX) }));
import { createBattle } from '../js/engine/battle.js';
import { createBot } from '../js/engine/bot.js';
import { mulberry32 } from '../js/engine/rng.js';

const [cpm = 300, acc = 0.97, N = 300] = process.argv.slice(2).map(Number);
const wins = Object.fromEntries(C.map(c => [c.id, { w: 0, g: 0 }]));
const why = { ko: 0, time: 0, count: 0, draw: 0 };
let seed = 1, n = 0, hpGap = 0;
for (const a of C) for (const b of C) {
  if (a === b) continue;
  for (let k = 0; k < N; k++) {
    const rng = mulberry32(seed++);
    const bt = createBattle({ chars: [a, b], rng });
    const b1 = createBot({ cpm, accuracy: acc, rng }), b2 = createBot({ cpm, accuracy: acc, rng });
    while (!bt.result()) { b1.step(0.1, bt, 'p1'); b2.step(0.1, bt, 'p2'); bt.step(0.1); }
    const r = bt.result(), s = bt.state();
    why[r.reason]++; n++; hpGap += Math.abs(s.p1.hp / s.p1.max - s.p2.hp / s.p2.max);
    wins[a.id].g++; wins[b.id].g++;
    if (r.winner === 'p1') wins[a.id].w++; else if (r.winner === 'p2') wins[b.id].w++;
  }
}
console.log(`CPM ${cpm} / 正確率 ${acc} / 各組${N}回`);
for (const c of C) console.log(`${c.name.padEnd(5, '　')} ${(100 * wins[c.id].w / wins[c.id].g).toFixed(1)}%  (${c.role})`);
console.log('決着:', Object.entries(why).map(([k, v]) => `${k} ${(100 * v / n).toFixed(0)}%`).join(' / '), `/ 平均HP割合差 ${(100 * hpGap / n).toFixed(0)}%`);
