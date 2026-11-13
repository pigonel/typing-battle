import { createStore } from './store.js';
import { TITLES } from '../data/titles.js';

const SKEY = 'tb.settings.v1', GKEY = 'tb.guest.v1';
export const DEFAULTS = {
  title: null, fx: true, bgm: 70, se: 70, theme: 'dark',
  hud: { ign: true, rank: true, title: true, streak: true },
  skillKeys: ['Shift+KeyD', 'Shift+KeyF'],
};

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存不可でも続行 */ } };

const saved = read(SKEY, {});
const mergeSettings = x => ({ ...DEFAULTS, ...x, hud: { ...DEFAULTS.hud, ...(x?.hud ?? {}) } });
export const guestIgn = () => {
  let g = read(GKEY, null);
  if (!g) { g = 'Guest_' + (1000 + Math.floor(Math.random() * 9000)); write(GKEY, g); }
  return g;
};
// 開発用: URLに ?account=1 を付けると「登録済みアカウント」として動く(ランクマッチの確認用)
const registered = false;

const BLANK_PROFILE = { rank: '未配置', name: '未配置', lp: 0, tier: 0, div: 1, total: 0, placed: false, demo: null, pg: 0, gm: false, streak: 0, titles: [] };
export const store = createStore({
  screen: 'menu', params: {}, mode: null, match: null, // mode: 'ranked' | 'normal'
  // ゲストの設定はこのブラウザに保存。ログイン中はアカウントごとにサーバーへ保存(称号はゲストでは装備なし)
  settings: { ...mergeSettings(saved), title: new URLSearchParams(location.search).has('unlock') ? saved.title ?? null : null },
  session: { guest: !registered, ign: registered ? (saved.ign || 'Player') : guestIgn(), online: navigator.onLine, server: false },
  // 開発用: ?unlock=1 で全称号を獲得済みとして表示(本来はサーバーが判定)
  profile: { ...BLANK_PROFILE, titles: new URLSearchParams(location.search).has('unlock') ? TITLES.map(t => t.id) : [] },
});

// サーバーから受け取った自分のプロフィール(ランク・称号など)を反映
export const applyProfile = p => store.set(s => ({ profile: { ...s.profile, rank: p.rank, name: p.rankName, lp: p.lp, tier: p.tier, div: p.div, total: p.totalLp, placed: p.placed, demo: p.demo, pg: p.pg, gm: p.gm, streak: p.streak, titles: p.titles } }));
export const applyUser = u => {
  store.set(s => ({ session: { ...s.session, guest: false, ign: u.ign, email: u.email } }));
  applyProfile(u);
  if (u.settings && Object.keys(u.settings).length) { // アカウントに保存されている設定に切り替える
    const settings = mergeSettings(u.settings);
    settings.title = u.titles.includes(settings.title) ? settings.title : null;
    store.set({ settings }); applySettings(settings);
  } else { store.set(s => ({ settings: { ...s.settings, title: null } })); syncNow(); } // 初めてのログイン: いまの設定をアカウントに保存
};
export const clearUser = () => { // ログアウト: ゲストの設定に戻す(称号は装備なし)
  const g = { ...mergeSettings(read(SKEY, {})), title: null };
  store.set(s => ({ session: { ...s.session, guest: true, ign: guestIgn(), email: null }, profile: { ...BLANK_PROFILE }, settings: g }));
  applySettings(g);
};

export function applySettings(s = store.get().settings) {
  const d = document.documentElement;
  d.dataset.theme = s.theme;
  d.dataset.fx = s.fx ? 'on' : 'off';
}
export const equippedTitle = st => (st.profile.titles.includes(st.settings.title) ? st.settings.title : null); // 持っている称号だけを装備として扱う
const tokenOf = () => { try { return localStorage.getItem('tb.token'); } catch { return null; } };
let syncTimer = 0;
export async function syncNow() { // ログイン中の設定をサーバー(アカウント)に保存
  clearTimeout(syncTimer);
  const { session, settings: x } = store.get();
  if (session.guest || location.protocol === 'file:') return;
  try {
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenOf()}` },
      body: JSON.stringify({ fx: x.fx, bgm: x.bgm, se: x.se, theme: x.theme, hud: x.hud, skillKeys: x.skillKeys, title: x.title }) });
  } catch { /* 通信できないときは、次の変更でもう一度送る */ }
}
export function saveSettings(patch) {
  const settings = { ...store.get().settings, ...patch };
  store.set({ settings });
  applySettings(settings);
  if (store.get().session.guest) write(SKEY, settings);
  else { clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 500); }
}

const setOnline = online => store.set(s => ({ session: { ...s.session, online } }));
addEventListener('online', () => setOnline(true));
addEventListener('offline', () => setOnline(false));
