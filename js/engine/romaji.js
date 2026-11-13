// ひらがな(読み)→ ローマ字入力の判定。si/shi, tu/tsu, hu/fu, n/nn, 促音の子音重ね などに対応
const BASE = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka,ca', き: 'ki', く: 'ku,cu', け: 'ke', こ: 'ko,co',
  さ: 'sa', し: 'si,shi,ci', す: 'su', せ: 'se,ce', そ: 'so',
  た: 'ta', ち: 'ti,chi', つ: 'tu,tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'hu,fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'zi,ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'di', づ: 'du', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'xa,la', ぃ: 'xi,li', ぅ: 'xu,lu', ぇ: 'xe,le', ぉ: 'xo,lo',
  ゃ: 'xya,lya', ゅ: 'xyu,lyu', ょ: 'xyo,lyo',
  ー: '-',
};
const COMBO = {
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', てぃ: 'thi', でぃ: 'dhi',
  うぃ: 'wi', うぇ: 'we', しぇ: 'she', じぇ: 'je', ちぇ: 'che',
};
const YOUON = { き: 'ky', ぎ: 'gy', し: 'sy,sh', じ: 'zy,j,jy', ち: 'ty,ch,cy', ぢ: 'dy', に: 'ny', ひ: 'hy', び: 'by', ぴ: 'py', み: 'my', り: 'ry' };
for (const [k, pre] of Object.entries(YOUON)) {
  for (const [s, v] of Object.entries({ ゃ: 'a', ゅ: 'u', ょ: 'o' })) COMBO[k + s] = pre.split(',').map(p => p + v).join(',');
}

const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

export function tokenize(reading, literal = false) {
  if (literal) return [...reading].map(c => ({ p: [c], k: c }));
  const s = toHira(reading), out = [];
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (COMBO[two]) { out.push({ p: COMBO[two].split(','), k: two }); i++; continue; }
    const c = s[i];
    if (c === 'っ') { out.push({ sok: true, k: 'っ' }); continue; }
    if (c === 'ん') { out.push({ nn: true, k: 'ん' }); continue; }
    if (BASE[c]) out.push({ p: BASE[c].split(','), k: c });
  }
  out.forEach((t, i) => {
    const nx = out[i + 1];
    if (t.sok) { // 促音: 次の音の子音を重ねる / xtu / ltu
      const letters = [];
      for (const q of nx?.p ?? []) if (!'aiueo-'.includes(q[0]) && !letters.includes(q[0])) letters.push(q[0]);
      t.p = [...letters, 'xtu', 'ltu'];
    } else if (t.nn) { // 「ん」: 次が母音・や行・語末なら nn が必要(な行の前は n でも nn でも可)
      const single = nx?.p && nx.p.every(q => !'aiueoy'.includes(q[0]));
      t.p = single ? ['n', 'nn'] : ['nn'];
    }
  });
  return out;
}

export function createTyper(reading, literal = false) {
  const tk = tokenize(reading, literal);
  let i = 0, cur = '', hist = '', lock = null, alt = null;
  const pats = idx => (lock && lock.idx === idx ? tk[idx].p.filter(p => p.startsWith(lock.L)) : tk[idx].p);
  const longer = (idx, c) => pats(idx).some(p => p.length > c.length && p.startsWith(c));
  const finish = () => {
    if (tk[i].sok && cur.length === 1) lock = { idx: i + 1, L: cur };
    i++; cur = '';
    return i >= tk.length;
  };
  const settle = () => (pats(i).includes(cur) && !longer(i, cur) ? (finish() ? 'done' : 'ok') : 'ok');

  const step = ch => {
    if (pats(i).some(p => p.startsWith(cur + ch))) {
      // 「ん」+な行 で n を2回: 「ん=nn」とも「ん=n + な行の頭のn」とも読めるので、両方の可能性を持つ
      if (tk[i].nn && cur === 'n' && ch === 'n' && pats(i).includes('n') && i + 1 < tk.length && tk[i + 1].p?.every(q => q[0] === 'n')) {
        alt = { i: i + 1, cur: '', lock, hist: hist + ch };
        i++; cur = 'n'; hist += ch;
        return 'ok';
      }
      cur += ch; hist += ch;
      return settle();
    }
    if (cur && pats(i).includes(cur) && i + 1 < tk.length) { // 「n」で確定済みの「ん」から次の音へ
      const saved = { i, cur, lock };
      finish();
      if (pats(i).some(p => p.startsWith(ch))) { cur = ch; hist += ch; return settle(); }
      ({ i, cur, lock } = saved);
    }
    return 'miss';
  };

  return {
    // 戻り値: 'ok'(正しい打鍵) / 'miss' / 'done'(この打鍵で単語完了)
    press(ch) {
      if (i >= tk.length) return 'done';
      const saved = alt; alt = null;
      const r = step(ch);
      if (r !== 'miss' || !saved) return r;
      ({ i, cur, lock, hist } = saved);
      return step(ch);
    },
    isDone: () => i >= tk.length,
    // 表示用: typed=打ち終えた分 / rest=残りの標準的な打ち方
    view() {
      let rest = '';
      if (i < tk.length) {
        const p = pats(i).find(x => x.startsWith(cur)) ?? pats(i)[0];
        rest = p.slice(cur.length);
        let forced = tk[i].sok && p.length === 1 ? p : null;
        for (let j = i + 1; j < tk.length; j++) {
          const ps = forced ? tk[j].p.filter(q => q.startsWith(forced)) : tk[j].p;
          const q = ps[0] ?? tk[j].p[0];
          rest += q;
          forced = tk[j].sok && q.length === 1 ? q : null;
        }
      }
      return { typed: hist, rest, kanaDone: tk.slice(0, i).map(x => x.k).join(''), kanaRest: tk.slice(i).map(x => x.k).join('') };
    },
  };
}
