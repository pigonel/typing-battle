// BAN/PICK。進行・時間切れの処理はサーバーが行う。ここは選択の表示と送信だけ
import { CHARACTERS, charById } from '../data/characters.js';
import { FORMATS } from '../data/words.js';
import { charArt } from '../data/art.js';
import { conn, LAST } from '../net/conn.js';
import { sfx } from '../core/audio.js';

const fname = id => FORMATS.find(f => f.id === id)?.name ?? id;
const STEP_NAME = { ban: 'キャラBAN', pick: 'キャラPICK', format: '単語形式BAN' };

export default {
  mount(el, { store, go }) {
    const match = store.get().match;
    if (!match) { go('menu'); return; }
    const ranked = match.mode === 'ranked', steps = ranked ? ['ban', 'pick', 'format'] : ['pick', 'format'];
    const ids = CHARACTERS.map(c => c.id);
    const S = { step: null, secs: 7, left: 7, at: 0, avail: ids, fmts: [], sel: [], locked: false, note: '', bans: { mine: [], theirs: [] }, fmtRes: null };
    let lastTick = 0;
    const need = () => (S.step === 'ban' ? 2 : 1);

    const render = () => {
      if (!S.step) { el.innerHTML = '<div class="dr"><h2 class="dr-guide">準備しています…</h2></div>'; return; }
      const showBans = ranked && (S.step !== 'ban' || S.locked), banned = id => S.bans.mine.includes(id) || S.bans.theirs.includes(id);
      const guide = { ban: `使わせたくないキャラを2体選んでください(${S.sel.length}/2)`, pick: '使うキャラを選んでください(相手には見えません)', format: '使わせたくない単語形式を1つ選んでください' }[S.step];
      const cards = S.step === 'format'
        ? `<div class="dr-fmts">${S.fmts.map(f => `<button class="dr-fmt ${S.sel[0] === f && !S.fmtRes ? 'sel' : ''} ${S.fmtRes && (S.fmtRes.mine === f || S.fmtRes.theirs === f) ? 'ban' : ''} ${S.fmtRes?.final === f ? 'final' : ''}" data-id="${f}"><b>${fname(f)}</b>${S.fmtRes?.mine === f ? '<em>あなたのBAN</em>' : ''}${S.fmtRes?.theirs === f ? '<em>相手のBAN</em>' : ''}${S.fmtRes?.final === f ? '<em>使用決定</em>' : ''}</button>`).join('')}</div>`
        : `<div class="dr-grid">${ids.map(id => {
          const c = charById(id), b = showBans && banned(id), mine = S.bans.mine.includes(id), theirs = S.bans.theirs.includes(id);
          return `<button class="dr-card ${S.sel.includes(id) ? 'sel' : ''} ${b ? 'ban' : ''}" data-id="${id}"><span class="dr-art">${charArt(c)}</span><b>${c.name}</b><small>${c.role}</small>${b ? `<i>${mine && theirs ? '両者BAN' : mine ? '自分のBAN' : '相手のBAN'}</i>` : ''}</button>`;
        }).join('')}</div>`;
      el.innerHTML = `<div class="dr">
        <div class="dr-head"><div class="dr-steps">${steps.map(s => `<span class="${s === S.step ? 'on' : steps.indexOf(s) < steps.indexOf(S.step) ? 'done' : ''}">${STEP_NAME[s]}</span>`).join('')}</div>
          <div class="dr-ring" style="--p:${(S.left / S.secs) * 100}"><b>${Math.ceil(S.left)}</b></div></div>
        <h2 class="dr-guide">${S.note || (S.locked ? '相手を待っています…' : guide)}</h2>${cards}
        <div class="row"><button class="btn primary" id="ok" ${S.locked || S.sel.length !== need() ? 'disabled' : ''}>決定</button><span class="dr-sub">${ranked ? 'ランクマッチ・BANは両者に公開されます' : '通常マッチ'} / 時間切れはランダムで決まります</span></div></div>`;
    };
    const onPhase = m => {
      Object.assign(S, { step: m.step, secs: m.secs, left: m.secs, at: performance.now(), avail: m.avail ?? ids, fmts: m.fmts ?? [], sel: [], locked: false, note: '', fmtRes: null });
      if (m.bans) S.bans = m.bans;
      render();
    };
    const commit = () => {
      if (S.locked || S.sel.length !== need()) return;
      S.locked = true; sfx('ui_ok');
      conn.send(S.step === 'ban' ? { t: 'ban', ids: S.sel } : S.step === 'pick' ? { t: 'pick', id: S.sel[0] } : { t: 'fmt', id: S.sel[0] });
      render();
    };
    const offs = [
      conn.on('phase', onPhase),
      conn.on('ban_result', m => { S.bans = { mine: m.mine, theirs: m.theirs }; S.locked = true; S.note = 'BANが決まりました'; sfx('ban'); render(); }),
      conn.on('pick_ok', () => { S.locked = true; S.note = 'ロックイン完了!'; sfx('pick'); render(); }),
      conn.on('fmt_result', m => { S.fmtRes = m; S.locked = true; S.note = `今回の単語形式は「${fname(m.final)}」`; sfx('ban'); render(); }),
      conn.on('vs', m => { store.set(s => ({ match: { ...s.match, vs: m } })); go('vs'); }),
      conn.on('match_end', m => go('result', { summary: m })),
      conn.on('_close', () => { el.innerHTML = '<div class="dr"><h2 class="dr-guide">サーバーとの接続が切れました</h2><div class="row"><button class="btn primary" id="home">メニューへ</button></div></div>'; }),
    ];
    el.addEventListener('click', e => {
      if (e.target.closest('#home')) return go('menu');
      if (S.locked) return;
      if (e.target.closest('#ok')) return commit();
      const c = e.target.closest('[data-id]'); if (!c) return;
      const id = c.dataset.id;
      if (S.step !== 'format' && !S.avail.includes(id)) return;
      if (S.step === 'ban') S.sel = S.sel.includes(id) ? S.sel.filter(x => x !== id) : S.sel.length < 2 ? [...S.sel, id] : S.sel;
      else S.sel = [id];
      sfx('ui_move'); render();
    });
    const onKey = e => { if (e.key === 'Enter') commit(); };
    addEventListener('keydown', onKey);
    const tick = setInterval(() => {
      if (!S.step || S.locked) return;
      S.left = Math.max(0, S.secs - (performance.now() - S.at) / 1000);
      const ring = el.querySelector('.dr-ring');
      if (ring) { ring.style.setProperty('--p', (S.left / S.secs) * 100); ring.firstChild.textContent = Math.ceil(S.left); }
      if (S.left <= 3 && Math.ceil(S.left) !== lastTick && S.left > 0) { lastTick = Math.ceil(S.left); sfx('tick'); }
    }, 100);
    render();
    const first = LAST.phase;
    if (first && first.seq > (match.foundSeq ?? 0)) onPhase(first); // 画面の切り替え中に届いていた場合
    return () => { clearInterval(tick); offs.forEach(f => f()); removeEventListener('keydown', onKey); };
  },
};
