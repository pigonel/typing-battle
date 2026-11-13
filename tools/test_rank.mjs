import assert from 'node:assert/strict';
import { newRank, applyMatch, divIndex, rankName, compatible, softReset, penalize, grandMasters, demotable } from '../server/rank.js';
const mk = (tier, div, lp, extra = {}) => ({ ...newRank(), placed: true, tier, div, lp, ...extra });
const m = (r, win, opp = divIndex(r)) => applyMatch(r, { win, oppIdx: opp, ranked: true });

// 配置戦: 5戦全勝(平均1000)→ プラチナ1
{ const r = newRank(); for (let i = 0; i < 4; i++) { m(r, true); assert.equal(r.placed, false); } const x = m(r, true); assert.equal(x.event, 'placed'); assert.equal(rankName(r), 'プラチナ1'); }
{ const r = newRank(); for (let i = 0; i < 5; i++) m(r, false); assert.equal(rankName(r), 'ブロンズ1'); }
// LP増減(相手が上/同等/下)
{ const r = mk(2, 2, 50); m(r, true, divIndex(r) + 1); assert.equal(r.lp, 75); m(r, false, divIndex(r) + 1); assert.equal(r.lp, 65); m(r, true); assert.equal(r.lp, 85); m(r, false, divIndex(r) - 1); assert.equal(r.lp, 65); }
// 昇格(100LPで即昇格・繰り越し)
{ const r = mk(1, 3, 90); const x = m(r, true); assert.equal(x.event, 'promoted'); assert.equal(rankName(r), 'ゴールド1'); assert.equal(r.lp, 10); }
{ const r = mk(4, 3, 95); m(r, true); assert.equal(r.tier, 5); assert.equal(r.lp, 15); assert.equal(rankName(r), 'マスター'); }
// ブロンズ〜プラチナの最下位区分はLP0で止まる(降格戦なし)
{ const r = mk(1, 1, 0); const x = m(r, false); assert.equal(x.event, null); assert.equal(r.lp, 0); assert.equal(r.demo, null); }
// LPが途中で0を下回る → 0で止まる(降格戦にはならない)。LP0で負けると降格戦
{ const r = mk(2, 2, 5); m(r, false); assert.equal(r.lp, 0); assert.equal(r.demo, null); const x = m(r, false); assert.equal(x.event, 'demo_start'); assert.deepEqual(r.demo, { w: 0, l: 0 }); }
// 降格戦: 2勝で残留(LP25)
{ const r = mk(2, 2, 0, { demo: { w: 0, l: 0 } }); m(r, true); m(r, false); const x = m(r, true); assert.equal(x.event, 'demo_stay'); assert.equal(r.lp, 25); assert.equal(r.demo, null); assert.equal(rankName(r), 'ゴールド2'); }
// 降格戦: 2敗で降格(LP50)。ダイヤ1→プラチナ3、マスター→ダイヤ3
{ const r = mk(2, 2, 0, { demo: { w: 0, l: 0 } }); m(r, false); const x = m(r, false); assert.equal(x.event, 'demoted'); assert.equal(rankName(r), 'ゴールド1'); assert.equal(r.lp, 50); }
{ const r = mk(4, 1, 0, { demo: { w: 0, l: 1 } }); m(r, false); assert.equal(rankName(r), 'プラチナ3'); }
{ const r = mk(5, 0, 0, { demo: { w: 0, l: 1 } }); m(r, false); assert.equal(rankName(r), 'ダイヤ3'); assert.equal(r.lp, 50); }
assert.equal(demotable(mk(3, 1, 0)), false); assert.equal(demotable(mk(4, 1, 0)), true);
// 切断ペナルティ・ソフトリセット
{ const r = mk(2, 2, 40); penalize(r); assert.equal(r.lp, 30); }
{ const r = mk(3, 1, 70); softReset(r); assert.equal(rankName(r), 'ゴールド2'); assert.equal(r.lp, 70); const g = mk(5, 0, 320); softReset(g); assert.equal(g.lp, 50); }
// マッチング範囲
{ const a = mk(2, 2, 0), b = mk(2, 3, 0), c = mk(2, 2, 0), d = mk(3, 1, 0), e = mk(4, 1, 0), f = mk(5, 0, 10);
  assert.equal(compatible(a, c, 0), true); assert.equal(compatible(a, b, 5), false); assert.equal(compatible(a, b, 16), true);
  assert.equal(compatible(a, d, 20), false); assert.equal(compatible(a, d, 31), true); assert.equal(compatible(a, e, 60), false);
  assert.equal(compatible(e, f, 0), true); assert.equal(compatible(d, e, 31), true);
  const u = newRank(); assert.equal(compatible(u, a, 0), true); const hi = { ...mk(2, 2, 0), mmr: 1600 }; assert.equal(compatible(u, hi, 0), false); }
// グランドマスター: マスター上位10位かつLP200以上
{ const list = Array.from({ length: 12 }, (_, i) => ({ id: `u${i}`, r: mk(5, 0, 600 - i * 20) })); const g = grandMasters(list); assert.equal(g.size, 10); assert.ok(g.has('u0') && !g.has('u10'));
  assert.equal(grandMasters([{ id: 'x', r: mk(5, 0, 150) }]).size, 0); }
console.log('ランク戦のテストに成功');
