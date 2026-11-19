import assert from 'node:assert/strict';
import { createKanaTyper } from '../js/engine/kana.js';
import { createWordInput } from '../js/engine/wordinput.js';
import { createBattle } from '../js/engine/battle.js';
import { CHARACTERS } from '../js/data/characters.js';
import { WORDS } from '../js/data/words.js';

const run = (reading, seq) => { const t = createKanaTyper(reading); return seq.flatMap(([c, r]) => t.press(c, !!r)); };
// 普通のかな
assert.deepEqual(run('ありがとう', [['あ'], ['り'], ['が'], ['と'], ['う']]), ['ok', 'ok', 'ok', 'ok', 'done']);
// 濁点: か→が(押し直して置き換わる)。途中の「か」はミスにならない
assert.deepEqual(run('がく', [['か'], ['が', 1], ['く']]), ['pending', 'ok', 'done']);
// 半濁点: は→ば→ぱ
assert.deepEqual(run('ぱ', [['は'], ['ば', 1], ['ぱ', 1]]), ['pending', 'pending', 'done']);
// 小さい「っ」: つ→っ。「ゃ」: や→ゃ。カタカナ入力も同じ扱い
assert.deepEqual(run('きっぷ', [['き'], ['つ'], ['っ', 1], ['は'], ['ば', 1], ['ぱ', 1], ['ぷ'].slice(0, 0)].flat ? [['き'], ['つ'], ['っ', 1], ['ふ'], ['ぶ', 1], ['ぷ', 1]] : []), ['ok', 'pending', 'ok', 'pending', 'pending', 'done']);
assert.deepEqual(run('ちゃ', [['ち'], ['や'], ['ゃ', 1]]), ['ok', 'pending', 'done']);
assert.deepEqual(run('ゆうしゃ', [['ユ'], ['ウ'], ['シ'], ['ヤ'], ['ャ', 1]]), ['ok', 'ok', 'ok', 'pending', 'done']);
// ミス: 違う文字 / 変換されないまま次を打つ
assert.deepEqual(run('あい', [['う']]), ['miss']);
assert.deepEqual(run('がく', [['か'], ['く']]), ['pending', 'miss', 'miss']); // 「か」を打ったあと、濁点を付けずに「く」を打った
assert.deepEqual(run('あ', [['あ', 1]]), ['miss']); // 途中でないものの書き換え
// 長音
assert.deepEqual(run('らーめん', [['ら'], ['ー'], ['め'], ['ん']]), ['ok', 'ok', 'ok', 'done']);
// 全単語が、かな入力でも最後まで打てる(濁点・小文字は途中の文字を経由)
const LEADS = { が: 'か', ぎ: 'き', ぐ: 'く', げ: 'け', ご: 'こ', ざ: 'さ', じ: 'し', ず: 'す', ぜ: 'せ', ぞ: 'そ', だ: 'た', ぢ: 'ち', づ: 'つ', で: 'て', ど: 'と', ば: 'は', び: 'ひ', ぶ: 'ふ', べ: 'へ', ぼ: 'ほ', ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ', ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お' };
for (const [fmt, list] of Object.entries(WORDS)) for (const w of list) {
  if (w.lit) continue;
  const wi = createWordInput(w); let last;
  for (const ch of w.r) {
    if (LEADS[ch]) { assert.deepEqual(wi.press('k', LEADS[ch]), ['pending'], `${fmt}:${w.t}`); last = wi.press('k', ch, true); }
    else last = wi.press('k', ch);
    assert.ok(!last.includes('miss'), `${fmt}:${w.t}:${ch}`);
  }
  assert.equal(last.at(-1), 'done', `${fmt}:${w.t}`);
}
// 入力方式は最初に打ったほうに固定
{ const wi = createWordInput({ t: 'ねこ', r: 'ねこ' }); assert.deepEqual(wi.press('r', 'n'), ['ok']); assert.deepEqual(wi.press('k', 'ね'), ['miss']); assert.equal(wi.mode, 'r'); }
{ const wi = createWordInput({ t: 'cat', r: 'cat', lit: true }); assert.deepEqual(wi.press('k', 'あ'), []); }
// スマホ入力のダメージ1.5倍
{ const A = CHARACTERS[0], B = CHARACTERS[1], mk = () => createBattle({ chars: [A, B], rng: () => 0.99 });
  const x = mk(), y = mk(); x.hit('p1'); y.hit('p1', 1.5);
  const dx = B.hp - x.state().p2.hp, dy = B.hp - y.state().p2.hp; assert.ok(Math.abs(dy / dx - 1.5) < 1e-9, `${dy / dx}`); }
console.log('かな入力・スマホ倍率のテストに成功');
