import { MENU_ITEMS } from '../data/menu.js';
import { esc } from '../core/dom.js';
import { titleName } from '../data/titles.js';
import { equippedTitle } from '../core/state.js';
import { rankIcon, rankColor, TIER_NAMES } from '../data/rank_icons.js';

const reason = (it, { session }) =>
  it.needs?.includes('online') && !session.server ? 'サーバーに接続できません(サーバーを起動して http://localhost:3000 を開いてください)'
  : it.needs?.includes('account') && session.guest ? 'アカウント登録が必要です(画面左上のボタンから登録できます)'
  : '';

export default {
  mount(el, { store, go }) {
    el.innerHTML = `
      <header class="hud" aria-label="プレイヤー情報"></header>
      <div class="menu">
        <nav class="menu-list" aria-label="メインメニュー">${MENU_ITEMS.map((it, i) =>
          `<button class="menu-item" data-i="${i}"><span class="jp">${it.label}</span><span class="en">${it.en}</span></button>`).join('')}</nav>
        <aside class="preview" aria-live="polite"></aside>
      </div>`;
    const $ = q => el.querySelector(q), btns = [...el.querySelectorAll('.menu-item')];
    let active = 0;

    const paintHud = () => {
      const { settings: s, session, profile: p } = store.get();
      const guest = session.guest, info = guest ? { placed: false } : { placed: p.placed, tier: p.tier, div: p.div, gm: p.gm };
      let name, total, pct, gtxt, tag = '';
      if (guest) { name = 'ゲスト'; total = '―'; pct = 0; gtxt = 'ログインして配置戦を行うと、ランクが付きます'; }
      else if (!p.placed) { name = '未配置'; total = '―'; pct = (p.pg / 5) * 100; gtxt = `配置戦 ${p.pg} / 5`; }
      else if (p.tier >= 5) { name = p.gm ? 'グランドマスター' : 'マスター'; total = p.total; pct = p.gm ? 100 : Math.min(100, (p.lp / 200) * 100); gtxt = p.gm ? `${p.lp} LP` : `${p.lp} LP(グランドマスターまで あと${Math.max(0, 200 - p.lp)}LP)`; }
      else { name = `${TIER_NAMES[p.tier]}${p.div}`; total = p.total; pct = p.lp; gtxt = `${p.lp} / 100 LP`; }
      if (!guest && p.demo) tag = `降格戦 ${p.demo.w}勝${p.demo.l}敗`;
      const card = s.hud.rank ? `<div class="rk" style="--rc:${rankColor(info)}">
        <div class="rk-icon">${rankIcon(info, 'hud')}</div>
        <div class="rk-body"><div class="rk-top"><span class="rk-name">${esc(name)}</span>${tag ? `<span class="rk-tag">${esc(tag)}</span>` : ''}</div>
          <div class="rk-total">総合LP <b>${esc(total)}</b></div>
          <div class="rk-gauge ${!guest && !p.placed ? 'seg' : ''}"><i style="width:${pct}%"></i><span>${esc(gtxt)}</span></div></div></div>` : '';
      const chips = [
        s.hud.ign && ['プレイヤー', session.ign],
        s.hud.title && ['称号', titleName(equippedTitle(store.get())) ?? 'なし'],
        s.hud.streak && ['連勝', `${p.streak}`],
      ].filter(Boolean).map(([k, v]) => `<div class="chip"><small>${k}</small><b>${esc(v)}</b></div>`).join('');
      $('.hud').innerHTML = `${card}<div class="chips">${chips}</div>`;
    };
    const paintList = () => btns.forEach((b, i) => {
      const off = !!reason(MENU_ITEMS[i], store.get());
      b.setAttribute('aria-disabled', off);
      b.classList.toggle('is-off', off);
      b.classList.toggle('is-active', i === active);
    });
    const paintPreview = () => {
      const it = MENU_ITEMS[active], r = reason(it, store.get());
      $('.preview').innerHTML = `<h2>${it.label}</h2><p>${it.desc}</p>
        <ul>${it.points.map(p => `<li>${p}</li>`).join('')}</ul>${r ? `<p class="warn">${r}</p>` : ''}`;
    };
    const paint = () => { paintHud(); paintList(); paintPreview(); };

    el.addEventListener('focusin', e => { const b = e.target.closest('.menu-item'); if (b) { active = +b.dataset.i; paint(); } });
    el.addEventListener('mouseover', e => { const b = e.target.closest('.menu-item'); if (b && document.activeElement !== b) b.focus(); });
    el.addEventListener('click', e => {
      const b = e.target.closest('.menu-item'); if (!b) return;
      const it = MENU_ITEMS[+b.dataset.i];
      if (reason(it, store.get())) return;
      store.set({ mode: it.mode ?? null });
      go(it.screen);
    });
    el.addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      btns[(active + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length].focus();
    });

    paint();
    btns[0].focus();
    return store.subscribe(paint);
  },
};
