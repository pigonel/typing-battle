import { CHARACTERS } from '../data/characters.js';
import { charArt } from '../data/art.js';
import { esc } from '../core/dom.js';

const MAX = { hp: 1700, atk: 4, def: 0.25, crit: 0.3, critMul: 2 };
const bar = (label, v, key, text) => `<div class="cx-bar"><span>${label}</span><i><u style="width:${Math.min(100, (v / MAX[key]) * 100)}%"></u></i><b>${text}</b></div>`;

const MIN = 10; // これ未満の試合数では「データ収集中」と表示
export default {
  mount(el, { go }) {
    let cur = 0, stats = null, failed = false;
    el.innerHTML = `<h1>キャラ図鑑</h1><div class="cx"><div class="cx-list">${CHARACTERS.map((c, i) =>
      `<button class="cx-item" data-i="${i}"><span class="cx-thumb">${charArt(c)}</span><b>${c.name}</b><small>${c.role}</small></button>`).join('')}</div>
      <section class="cx-detail panel"></section></div><div class="row"><button class="btn" id="back">メニューへ戻る</button></div>`;
    const items = [...el.querySelectorAll('.cx-item')], box = el.querySelector('.cx-detail');
    const paint = () => {
      const c = CHARACTERS[cur];
      items.forEach((b, i) => b.setAttribute('aria-pressed', i === cur));
      box.innerHTML = `<div class="cx-art">${charArt(c)}</div><div class="cx-info">
        <h2>${c.name}<small>${c.role}</small></h2><p class="cx-lore">${esc(c.lore)}</p>
        ${bar('HP', c.hp, 'hp', c.hp)}${bar('攻撃力', c.atk, 'atk', c.atk)}${bar('防御', c.def, 'def', `${Math.round(c.def * 100)}%`)}${bar('会心率', c.crit, 'crit', `${Math.round(c.crit * 100)}%`)}${bar('会心倍率', c.critMul, 'critMul', `×${c.critMul}`)}
        <div class="cx-pas"><small>パッシブ</small><b>${esc(c.passive.name)}</b><span>${esc(c.passive.desc)}</span></div>
        ${c.skills.map((s, i) => `<div class="cx-sk"><small>スキル${i + 1}・ゲージ${s.cost}</small><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></div>`).join('')}
        ${statBlock(c)}</div>`;
    };
    const statBlock = c => {
      if (failed) return '<div class="cx-st"><small>使用率・勝率</small><p class="note">サーバーに接続すると表示されます(サーバーを起動して http://localhost:3000 を開いてください)</p></div>';
      if (!stats) return '<div class="cx-st"><small>使用率・勝率</small><p class="note">読み込み中…</p></div>';
      const x = stats.list[c.id] ?? { picks: 0, wins: 0 }, share = stats.total ? x.picks / stats.total : 0, wr = x.picks ? x.wins / x.picks : 0;
      const order = [...CHARACTERS].sort((a, b) => (stats.list[b.id]?.picks ?? 0) - (stats.list[a.id]?.picks ?? 0)), rank = order.findIndex(o => o.id === c.id) + 1;
      const mine = stats.mine?.[c.id], few = x.picks < MIN;
      return `<div class="cx-st"><small>使用率・勝率(全プレイヤーの対戦。${x.picks}試合)${few ? ' ― データ収集中' : ''}</small>
        <div class="cx-bar"><span>使用率</span><i><u style="width:${Math.min(100, share * 100 * 2.5)}%"></u></i><b>${(share * 100).toFixed(1)}%</b></div>
        <div class="cx-bar"><span>勝率</span><i class="wr"><u style="width:${wr * 100}%"></u></i><b>${x.picks ? (wr * 100).toFixed(1) + '%' : '―'}</b></div>
        <p class="note">${x.picks ? `使用率 ${rank}位 / 8体` : 'まだ対戦の記録がありません'}${mine ? `　あなた: ${mine.played}戦 ${mine.wins}勝(${((mine.wins / mine.played) * 100).toFixed(0)}%)` : ''}</p></div>`;
    };
    (async () => {
      try {
        let token = null; try { token = localStorage.getItem('tb.token'); } catch { /* 無視 */ }
        const r = await fetch('/api/charstats', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!r.ok) throw new Error('x');
        stats = await r.json();
      } catch { failed = true; }
      paint();
    })();
    el.addEventListener('click', e => {
      const b = e.target.closest('.cx-item');
      if (b) { cur = +b.dataset.i; paint(); } else if (e.target.id === 'back') go('menu');
    });
    const onKey = e => {
      const d = { ArrowRight: 1, ArrowDown: 4, ArrowLeft: -1, ArrowUp: -4 }[e.key];
      if (d) { cur = (cur + d + CHARACTERS.length) % CHARACTERS.length; paint(); items[cur].focus(); e.preventDefault(); }
      else if (e.key === 'Escape') go('menu');
    };
    addEventListener('keydown', onKey);
    paint(); items[0].focus();
    return () => removeEventListener('keydown', onKey);
  },
};
