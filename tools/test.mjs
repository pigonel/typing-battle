import assert from 'node:assert/strict';
import { createTyper } from '../js/engine/romaji.js';
import { createBattle } from '../js/engine/battle.js';
import { CHARACTERS } from '../js/data/characters.js';
import { WORDS } from '../js/data/words.js';
import { mulberry32 } from '../js/engine/rng.js';
import { RULES } from '../js/engine/rules.js';

// 入力: 全部通れば最後が 'done'。途中でmissならその位置までの結果を返す
const feed = (reading, keys, lit = false) => { const t = createTyper(reading, lit); return [...keys].map(k => t.press(k)); };
const ok = (r, k, lit = false) => assert.equal(feed(r, k, lit).at(-1), 'done', `${r} ← ${k}`);
const ng = (r, k, lit = false) => { const x = feed(r, k, lit); assert.ok(x.includes('miss') || x.at(-1) !== 'done', `${r} ← ${k} が通ってしまった`); };

ok('こんにちは', 'konnichiha'); ok('こんにちは', 'konnnichiha'); ok('こんにちは', 'konnitiha');
ng('こんにちは', 'konichiha');            // ん+な行は nn 必須
ok('さんさ', 'sansa'); ok('さんさ', 'sannsa'); // んさ → nsa / nnsa どちらも可
ok('きんえん', 'kinnenn'); ng('きんえん', 'kinen');
ok('きって', 'kitte'); ok('きっぷ', 'kippu'); ok('いっち', 'icchi'); ok('いっち', 'itti'); ok('いっち', 'ixtuti');
ok('しゃ', 'sha'); ok('しゃ', 'sya'); ok('ちょっと', 'chotto'); ok('ちょっと', 'tyotto');
ok('らーめん', 'ra-menn'); ok('つ', 'tu'); ok('つ', 'tsu'); ok('ふ', 'fu'); ok('ふ', 'hu');
ok('じゅうにんといろ', 'juunintoiro'); ok('かんこーひー', 'kannko-hi-');
ok('battle', 'battle', true); ng('battle', 'battlf', true);
// 全単語が標準の打ち方で完走できる(辞書の読みに未対応文字がないか)
for (const [fmt, list] of Object.entries(WORDS)) for (const w of list) {
  const ty = createTyper(w.r, !!w.lit); let guard = 0, last;
  while (!ty.isDone() && guard++ < 400) { const k = ty.view().rest[0]; last = ty.press(k); assert.notEqual(last, 'miss', `${fmt}:${w.t}`); }
  assert.ok(ty.isDone(), `${fmt}:${w.t} 未完了`);
}
// view(): 打った分と残り
{ const t = createTyper('かんじ'); t.press('k'); t.press('a'); const v = t.view(); assert.deepEqual([v.typed, v.rest, v.kanaDone, v.kanaRest], ['ka', 'nzi', 'か', 'んじ']); }

// バトル
const A = CHARACTERS[0], B = CHARACTERS[1];
{ const b = createBattle({ chars: [A, B], rng: () => 0.99 }); // クリなし
  for (let i = 0; i < 9; i++) b.hit('p1');
  const s9 = b.state(); b.hit('p1'); const s10 = b.state();
  const d9 = B.hp - s9.p2.hp, d10 = s9.p2.hp - s10.p2.hp;
  assert.ok(d10 > (d9 / 9) * 1.019, '10コンボで+2%'); // 1発あたりのダメージが増える
  b.miss('p1'); assert.equal(b.state().p1.combo, 0);
  assert.ok(Math.abs(b.state().p1.hp - A.hp * (1 - RULES.MISS_SELF_PCT)) < 1e-6, 'ミスで最大HPの一定割合を自傷'); }
{ const b = createBattle({ chars: [A, B], rng: () => 0.99 });
  assert.equal(b.skill('p1', 0), false, 'ゲージ不足では発動できない');
  while (b.state().p1.gauge < 100) b.hit('p1');
  assert.equal(b.skill('p1', 0), true); }
{ const b = createBattle({ chars: [A, A], rng: () => 0.99 }); // 同HP割合・文字数多い方が勝つ
  b.hit('p1'); b.miss('p2'); b.step(60); assert.ok(['p1', 'p2', 'draw'].includes(b.result().winner)); }
{ const b = createBattle({ chars: [A, B], rng: () => 0.99 }); b.step(60); assert.equal(b.result().winner, 'draw'); } // 完全同値
{ const b = createBattle({ chars: [A, B], rng: () => 0.99 }); b.surrender('p1'); assert.equal(b.result().winner, 'p2'); }
{ const b = createBattle({ chars: [A, B], rng: () => 0.99 }); let n = 0; while (!b.result() && n++ < 5000) b.hit('p1'); assert.equal(b.result().reason, 'ko'); }
console.log('すべてのテストに成功');
{ // パッシブ
  const by = id => CHARACTERS.find(c => c.id === id);
  const mkB = (a, b) => createBattle({ chars: [by(a), by(b)], rng: () => 0.99 });
  { const b = mkB('saint', 'golem'), c = mkB('thief', 'golem'); b.hit('p2'); c.hit('p2'); const d1 = by('saint').hp - b.state().p1.hp, d2 = by('thief').hp - c.state().p1.hp; assert.ok(Math.abs(d1 / d2 - (1 - 0.05 - by('saint').def) / (1 - by('thief').def)) < 1e-6, '聖女: 被ダメージ5%カット'); }
  { const b = mkB('monk', 'golem'); for (let i = 0; i < 20; i++) b.hit('p1'); b.miss('p1'); assert.equal(b.state().p1.combo, 10, '武闘家: ミスでコンボが10減る'); b.miss('p1'); b.miss('p1'); assert.equal(b.state().p1.combo, 0, '武闘家: 0未満にはならない'); }
  { const b = mkB('witch', 'golem'); b.miss('p1'); const before = b.state().p1.hp; b.hit('p1'); assert.ok(b.state().p1.hp > before, '魔女: 吸命'); }
  { const b = mkB('golem', 'thief'); for (let i = 0; i < 40; i++) b.hit('p2'); const h = b.state().p1.hp; b.step(10); assert.ok(b.state().p1.hp > h, 'ゴーレム: 再生'); }
  { const b = mkB('thief', 'golem'), c = mkB('thief', 'golem'); b.hit('p1'); const e0 = b.drain()[0].dmg; c.step(13); c.hit('p1'); const e1 = c.drain().find(e => e.type === 'hit').dmg; assert.ok(Math.abs(e0 / e1 - 1.15) < 1e-6, 'シーフ: 開始12秒は与ダメージ1.15倍'); }
}
for (const [f, n] of Object.entries({ daily: 100, anime: 100, yoji: 100, english: 100 })) assert.ok(WORDS[f].length >= n, `${f} は${n}語以上`);
assert.ok(WORDS.text.length >= 50, '長文は50文以上');
console.log('パッシブ・単語数のテストに成功');

{ // 新しいスキル・必要ゲージ
  const by = id => CHARACTERS.find(c => c.id === id);
  assert.deepEqual(by('saint').skills.map(k => k.cost), [75, 175]); assert.deepEqual(by('witch').skills.map(k => k.cost), [125, 200]); assert.deepEqual(by('phantom').skills.map(k => k.cost), [125, 250]);
  const b = createBattle({ chars: [by('phantom'), by('thief')], rng: () => 0.99 });
  for (let i = 0; i < 120; i++) b.hit('p2'); // 相手のゲージとコンボを溜める
  const before = b.state().p2; for (let i = 0; i < 300 && b.state().p1.gauge < 250; i++) b.hit('p1');
  assert.ok(b.skill('p1', 1), 'ファントムのスキル2'); const after = b.state();
  assert.equal(after.p2.combo, 0); assert.ok(after.p2.gauge <= before.gauge * 0.25 + 3, `ゲージが25%まで減る(${before.gauge}→${after.p2.gauge})`);
  assert.ok(after.p2.fx.includes('atkDown')); }
console.log('スキル調整のテストに成功');
