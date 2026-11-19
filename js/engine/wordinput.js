// 1つの単語の入力(ローマ字 / かな)。最初に正しく打てた方式に固定され、途中で切り替えるとミスになる
import { createTyper } from './romaji.js';
import { createKanaTyper } from './kana.js';

export function createWordInput(word) {
  const romaji = createTyper(word.r, !!word.lit), kana = word.lit ? null : createKanaTyper(word.r);
  let mode = null;
  return {
    // kind: 'r'=ローマ字 / 'k'=かな。戻り値は結果の配列('ok' / 'done' / 'pending' / 'miss')
    press(kind, ch, replace = false) {
      if (kind === 'k' && !kana) return []; // 英単語にかな入力はない
      if (mode && mode !== kind) return ['miss'];
      const res = kind === 'r' ? [romaji.press(ch)] : kana.press(ch, replace);
      if (!mode && res.some(x => x === 'ok' || x === 'done')) mode = kind;
      return res;
    },
    get mode() { return mode; },
    // 画面表示用: かなの進み具合と、ローマ字の残り
    view() {
      if (mode === 'k') { const v = kana.view(); return { kanaDone: v.typed, kanaRest: v.rest, typed: '', rest: '', pending: v.pending }; }
      return { ...romaji.view(), pending: '' };
    },
  };
}
