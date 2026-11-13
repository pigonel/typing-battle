// 画面左上のアカウント表示と、ログイン/新規登録のダイアログ
import { store, applyUser, clearUser } from './state.js';
import { Auth, validate } from './auth.js';
import { conn } from '../net/conn.js';
import { esc } from './dom.js';

const HIDE_ON = new Set(['matching', 'draft', 'vs', 'battle']); // 対戦中は隠す

export function mountAccountBar(host) {
  host.innerHTML = '<div class="ab"></div><div class="am" hidden></div>';
  const bar = host.querySelector('.ab'), modal = host.querySelector('.am');
  let tab = 'login', busy = false, err = '', vals = {};

  const paintBar = () => {
    const { session: s, screen } = store.get();
    host.hidden = HIDE_ON.has(screen);
    bar.innerHTML = s.guest
      ? `<span class="ab-dot"></span><span class="ab-name"><b>ゲスト</b><small>${esc(s.ign)}</small></span><button class="btn primary" data-a="open">ログイン / 新規登録</button>`
      : `<span class="ab-dot on"></span><span class="ab-name"><b>${esc(s.ign)}</b><small>${esc(s.email ?? 'アカウント')}</small></span><button class="btn" data-a="out">ログアウト</button>`;
  };
  const paintModal = () => {
    const reg = tab === 'register', v = k => esc(vals[k] ?? '');
    modal.innerHTML = `<div class="am-box" role="dialog" aria-modal="true" aria-label="アカウント">
      <div class="am-tabs"><button data-tab="login" aria-pressed="${!reg}">ログイン</button><button data-tab="register" aria-pressed="${reg}">新規登録</button></div>
      <form id="am-form" novalidate>
        <label>メールアドレス<input name="email" type="email" autocomplete="email" value="${v('email')}"></label>
        ${reg ? `<label>プレイヤー名(3〜16文字の英数字と _ - .)<input name="ign" maxlength="16" autocomplete="nickname" value="${v('ign')}"></label>` : ''}
        <label>パスワード${reg ? '(8文字以上)' : ''}<input name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}"></label>
        ${reg ? '<label>パスワード(確認)<input name="password2" type="password" autocomplete="new-password"></label>' : ''}
        <p class="am-err" role="alert">${esc(err)}</p>
        <div class="row"><button class="btn primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? '通信中…' : reg ? '登録する' : 'ログイン'}</button><button class="btn" type="button" data-a="close">閉じる</button></div>
        ${reg ? '<p class="note">いまのゲストの戦績・称号・設定は、そのまま引き継がれます。</p>' : ''}
        <p class="note">Gmailなど、普段お使いのメールアドレスで登録できます(確認メールは送りません)。</p>
      </form></div>`;
    (modal.querySelector(err ? 'input[type=password]' : 'input'))?.focus();
  };
  const open = () => { modal.hidden = false; tab = 'login'; err = ''; paintModal(); };
  const close = () => { modal.hidden = true; busy = false; };

  host.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a, t = e.target.closest('[data-tab]')?.dataset.tab;
    if (a === 'open') open();
    else if (a === 'close' || e.target === modal) close();
    else if (a === 'out') { await Auth.logout(); clearUser(); conn.reconnect(); }
    else if (t) { tab = t; err = ''; paintModal(); }
  });
  host.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    vals = Object.fromEntries(new FormData(e.target)); vals.email = (vals.email ?? '').trim(); vals.ign = (vals.ign ?? '').trim();
    const reg = tab === 'register';
    err = validate(vals, reg);
    if (err) return paintModal();
    busy = true; err = ''; paintModal();
    const r = await (reg ? Auth.register(vals) : Auth.login(vals));
    busy = false;
    if (r.error) { err = r.error; return paintModal(); }
    applyUser(r.user); conn.reconnect(); vals = {}; close();
  });
  addEventListener('keydown', e => { // ダイアログ表示中のEscは、ダイアログだけを閉じる
    if (e.key === 'Escape' && !modal.hidden) { e.stopImmediatePropagation(); close(); }
  }, true);
  store.subscribe(paintBar);
  paintBar();
}
