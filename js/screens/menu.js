import { MENU_ITEMS } from '../data/menu.js';
import { esc } from '../core/dom.js';
import { titleName } from '../data/titles.js';

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
      $('.hud').innerHTML = [
        s.hud.ign && ['プレイヤー', session.ign],
        s.hud.rank && ['ランク', p.rank + (p.lp ? ` ${p.lp}LP` : '')],
        s.hud.title && ['称号', titleName(s.title) ?? 'なし'],
        s.hud.streak && ['連勝', `${p.streak}`],
      ].filter(Boolean).map(([k, v]) => `<div class="chip"><small>${k}</small><b>${esc(v)}</b></div>`).join('');
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
