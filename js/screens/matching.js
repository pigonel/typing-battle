import { conn } from '../net/conn.js';
import { sfx } from '../core/audio.js';
import { isMobile } from '../core/device.js';
import { esc } from '../core/dom.js';
import { equippedTitle } from '../core/state.js';
import { titleName } from '../data/titles.js';
import { rankIcon, parseRank } from '../data/rank_icons.js';

export default {
  mount(el, { store, go }) {
    const st = store.get(), mode = st.mode === 'ranked' ? 'ranked' : 'normal', ranked = mode === 'ranked';
    const card = (p, side) => `<div class="mt-card ${side}"><span class="mt-ico">${rankIcon(parseRank(p.rank), 'mt' + side)}</span><div><small>${esc(p.title ?? '称号なし')}</small><b>${esc(p.ign)}</b><em>${esc(p.rank)}</em></div></div>`;
    el.innerHTML = `<div class="mt">
      <div class="mt-mode">${ranked ? 'ランクマッチ' : '通常マッチ'}</div>
      <div class="mt-radar"><i></i><i></i><i></i><b></b></div>
      <h2 class="mt-msg">対戦相手を探しています…</h2><p class="mt-time">0:00</p>
      <p class="note mt-sub">${ranked ? `あなたのランク: ${esc(st.profile.rank)}(待ち時間が長いほど、探す範囲が広がります)` : 'ほかのプレイヤーを探しています'}</p>
      <div class="mt-found" hidden></div>
      <div class="row mt-act"><button class="btn" id="cancel">キャンセル</button></div></div>`;
    const $ = q => el.querySelector(q);
    let done = false, gone = 0;
    const t0 = performance.now();
    const tick = setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000); $('.mt-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 250);
    const offs = [
      conn.on('found', m => {
        done = true; clearInterval(tick); sfx('found');
        const s = store.get();
        store.set({ match: { mode, firstTo: m.firstTo, opp: m.opp, foundSeq: m.seq } });
        $('.mt-radar').classList.add('ok'); $('.mt-msg').textContent = 'マッチ成立!'; $('.mt-act').hidden = true; $('.mt-sub').hidden = true;
        const found = $('.mt-found'); found.hidden = false;
        found.innerHTML = `${card({ ign: s.session.ign, rank: s.session.guest ? 'ゲスト' : s.profile.name, title: titleName(equippedTitle(s)) }, 'l')}<span>VS</span>${card(m.opp, 'r')}`;
        gone = setTimeout(() => go('draft'), 1300);
      }),
      conn.on('error', m => { clearInterval(tick); $('.mt-msg').textContent = m.msg ?? 'エラーが発生しました'; $('.mt-radar').hidden = true; $('#cancel').textContent = 'メニューへ戻る'; }),
      conn.on('_close', () => { if (!done) { clearInterval(tick); $('.mt-msg').textContent = 'サーバーとの接続が切れました'; $('#cancel').textContent = 'メニューへ戻る'; } }),
    ];
    conn.send({ t: 'queue', mode, device: isMobile() ? 'mobile' : 'pc' });
    const cancel = () => { if (!done) { conn.send({ t: 'cancel' }); go('menu'); } };
    el.addEventListener('click', e => { if (e.target.id === 'cancel') cancel(); });
    const onKey = e => { if (e.key === 'Escape') cancel(); };
    addEventListener('keydown', onKey);
    return () => { clearInterval(tick); clearTimeout(gone); offs.forEach(f => f()); removeEventListener('keydown', onKey); };
  },
};
