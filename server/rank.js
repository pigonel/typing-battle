// ランク戦のルール(サーバー専用・純粋関数)。仕様: 「タイピングランクの形式.txt」
//  状態 r = { placed, tier(0=ブロンズ..5=マスター), div(1..3 / マスターは0), lp, demo:null|{w,l}, mmr, pg, pw, po }
export const TIERS = ['ブロンズ', 'シルバー', 'ゴールド', 'プラチナ', 'ダイヤ', 'マスター'];
export const MASTER = 5;
const LADDER = [[0, 1], [0, 3], [1, 2], [2, 1], [2, 3], [3, 1]]; // 配置戦後の初期ランク(上限 プラチナ1)

export const newRank = () => ({ placed: false, tier: 0, div: 1, lp: 0, demo: null, mmr: 1000, pg: 0, pw: 0, po: 0 });
export const divIndex = r => (r.tier >= MASTER ? 15 : r.tier * 3 + r.div - 1);
export const rankName = (r, gm = false) => (!r.placed ? '未配置' : r.tier >= MASTER ? (gm ? 'グランドマスター' : 'マスター') : `${TIERS[r.tier]}${r.div}`);
export const rankLabel = (r, gm = false) => (!r.placed ? `未配置(配置戦 ${r.pg}/5)` : `${rankName(r, gm)} ${r.lp}LP${r.demo ? '・降格戦' : ''}`);
export const rankValue = r => (r.tier >= MASTER ? 1500 + r.lp : divIndex(r) * 100 + r.lp); // ランキング用の比較値

// 降格が起こりうる区分か(ブロンズ〜プラチナの最下位区分は、ティアをまたぐ降格なし)
export const demotable = r => !(r.tier <= 3 && r.div === 1);

const expected = (a, b) => 1 / (1 + 10 ** ((b - a) / 400));
export const updateMmr = (r, oppMmr, win, k = 24) => { r.mmr = Math.round(r.mmr + k * ((win ? 1 : 0) - expected(r.mmr, oppMmr))); };

export function lpDelta(myIdx, oppIdx, win) {
  if (oppIdx > myIdx) return win ? 25 : -10;
  if (oppIdx < myIdx) return win ? 15 : -20;
  return win ? 20 : -15;
}

function promote(r) {
  while (r.lp >= 100) {
    r.lp -= 100;
    if (r.tier >= MASTER) { r.lp += 100; break; } // マスターはLPが独立して上がり続ける
    if (r.div < 3) r.div++;
    else { r.tier++; r.div = r.tier >= MASTER ? 0 : 1; }
    if (r.tier >= MASTER) break;
  }
}
function demote(r) {
  r.demo = null;
  if (r.tier >= MASTER) { r.tier = 4; r.div = 3; } else if (r.div > 1) r.div--; else { r.tier--; r.div = 3; } // ダイヤ1 → プラチナ3
  r.lp = 50;
}

// 1試合の結果を反映。ranked=ランクマッチ(LPが動く)。戻り値の event: 'placed' / 'promoted' / 'demo_start' / 'demo_stay' / 'demoted' / null
export function applyMatch(r, { win, oppIdx = null, oppMmr = 1000, ranked, cpu = false }) {
  const before = { ...r, demo: r.demo && { ...r.demo } };
  let event = null, delta = 0;
  updateMmr(r, oppMmr, win, cpu ? 12 : r.placed ? 24 : 40);
  if (!ranked) return { before, after: r, delta, event };
  if (!r.placed) {
    r.pg++; r.pw += win ? 1 : 0; r.po += oppMmr;
    if (r.pg >= 5) {
      const p = Math.min(5, Math.max(0, r.pw + (r.po / r.pg - 1000) / 200)), [t, d] = LADDER[Math.round(p)];
      Object.assign(r, { placed: true, tier: t, div: d, lp: 30 });
      event = 'placed';
    }
    return { before, after: r, delta, event };
  }
  if (r.demo) { // 降格戦(3試合中2勝で残留、2敗で降格。LPは動かない)
    win ? r.demo.w++ : r.demo.l++;
    if (r.demo.w >= 2) { r.demo = null; r.lp = 25; event = 'demo_stay'; } else if (r.demo.l >= 2) { demote(r); event = 'demoted'; }
    return { before, after: r, delta, event };
  }
  delta = lpDelta(divIndex(r), oppIdx ?? divIndex(r), win);
  if (!win && r.lp === 0 && demotable(r)) { r.demo = { w: 0, l: 0 }; event = 'demo_start'; delta = 0; }
  else {
    const t0 = r.tier * 10 + r.div;
    r.lp = Math.max(0, r.lp + delta);
    promote(r);
    if (r.tier * 10 + r.div > t0) event = 'promoted';
  }
  return { before, after: r, delta, event };
}

// 切断ペナルティ(敗北扱いに加えてLP-10)
export function penalize(r, lp = 10) { if (r.placed && !r.demo) r.lp = Math.max(0, r.lp - lp); }

// シーズン終了時のソフトリセット(準備のみ。基本2区分下げる。マスター以上はマスターLP50まで)
export function softReset(r) {
  if (!r.placed) return r;
  if (r.tier >= MASTER) { r.lp = Math.min(r.lp, 50); r.demo = null; return r; }
  const idx = Math.max(0, divIndex(r) - 2);
  Object.assign(r, { tier: Math.floor(idx / 3), div: (idx % 3) + 1, demo: null });
  return r;
}

// マッチング可能か。waitSec=待ち時間の長い方の秒数
export function compatible(a, b, waitSec) {
  if (!a.placed || !b.placed) return Math.abs(a.mmr - b.mmr) <= 150 + 20 * waitSec; // 配置戦中は隠しレートが近い相手
  if (a.tier >= 4 && b.tier >= 4) return true; // ダイヤ以上は全帯混合
  if (a.tier >= 4 || b.tier >= 4) return waitSec >= 30 && Math.abs(a.tier - b.tier) === 1;
  if (a.tier === b.tier) return waitSec >= 30 || (waitSec >= 15 ? Math.abs(a.div - b.div) <= 1 : a.div === b.div);
  return waitSec >= 30 && Math.abs(a.tier - b.tier) === 1;
}

// グランドマスター = マスターのうち上位10位 かつ マスターLP200以上
export function grandMasters(ranks /* [{id, r}] */) {
  return new Set(ranks.filter(x => x.r.placed && x.r.tier >= MASTER && x.r.lp >= 200).sort((p, q) => q.r.lp - p.r.lp).slice(0, 10).map(x => x.id));
}
