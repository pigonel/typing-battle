// かな入力(スマホのフリック入力など)の判定。サーバーとブラウザで同じコードを使う
// 濁点・小文字・「っ」は、キーを押し直して変わる(か→が、や→ゃ)ので、変わる前の文字を打った段階は「途中」として扱う
const kanaHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const CYCLES = ['かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'つっづ', 'てで', 'とど',
  'はばぱ', 'ひびぴ', 'ふぶぷ', 'へべぺ', 'ほぼぽ', 'やゃ', 'ゆゅ', 'よょ', 'あぁ', 'いぃ', 'うぅゔ', 'えぇ', 'おぉ', 'わゎ'];
const LEAD = {}; // 目的の文字 → 途中で許す文字
for (const c of CYCLES) for (const t of c) LEAD[t] = [...c].filter(x => x !== t).join('');

export const isKana = ch => /^[ぁ-ゖァ-ヶー]$/.test(ch);

export function createKanaTyper(reading) {
  const target = kanaHira(reading).replace(/[\s、。,.]/g, '');
  let i = 0, pending = '';
  return {
    // 戻り値: 結果の配列 'ok'(1文字正解) / 'done'(語を打ち終えた) / 'pending'(変換の途中) / 'miss'
    // replace=true: 直前に打った文字が、濁点などで別の文字に置き換わった
    press(ch, replace = false) {
      ch = kanaHira(ch);
      if (i >= target.length) return ['done'];
      const want = target[i], out = [];
      if (!replace && pending) { out.push('miss'); pending = ''; } // 変換されないまま次を打った
      if (replace && !pending) return ['miss'];
      if (ch === want) { i++; pending = ''; out.push(i >= target.length ? 'done' : 'ok'); }
      else if ((LEAD[want] ?? '').includes(ch)) { pending = ch; out.push('pending'); }
      else { pending = ''; out.push('miss'); }
      return out;
    },
    isDone: () => i >= target.length,
    view: () => ({ typed: target.slice(0, i), rest: target.slice(i), pending }),
  };
}
