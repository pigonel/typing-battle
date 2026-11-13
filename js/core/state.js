import { createStore } from './store.js';
import { TITLES } from '../data/titles.js';

const SKEY = 'tb.settings.v1', GKEY = 'tb.guest.v1';
export const DEFAULTS = {
  ign: '', title: null, fx: true, bgm: 70, se: 70, theme: 'dark',
  hud: { ign: true, rank: true, title: true, streak: true },
  skillKeys: ['Shift+KeyD', 'Shift+KeyF'],
};

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存不可でも続行 */ } };

const saved = read(SKEY, {});
export const guestIgn = () => {
  let g = read(GKEY, null);
  if (!g) { g = 'Guest_' + (1000 + Math.floor(Math.random() * 9000)); write(GKEY, g); }
  return g;
};
// 開発用: URLに ?account=1 を付けると「登録済みアカウント」として動く(ランクマッチの確認用)
const registered = false;

export const store = createStore({
  screen: 'menu', params: {}, mode: null, match: null, // mode: 'ranked' | 'normal'
  settings: { ...DEFAULTS, ...saved, hud: { ...DEFAULTS.hud, ...saved.hud } },
  session: { guest: !registered, ign: registered ? (saved.ign || 'Player') : guestIgn(), online: navigator.onLine, server: false },
  // 開発用: ?unlock=1 で全称号を獲得済みとして表示(本来はサーバーが判定)
  profile: { rank: '未配置', lp: 0, streak: 0, titles: new URLSearchParams(location.search).has('unlock') ? TITLES.map(t => t.id) : [] },
});

// サーバーから受け取った自分のプロフィール(ランク・称号など)を反映
export const applyProfile = p => store.set(s => ({ profile: { ...s.profile, rank: p.rank, lp: 0, streak: p.streak, titles: p.titles } }));
export const applyUser = u => {
  store.set(s => ({ session: { ...s.session, guest: false, ign: u.ign, email: u.email } }));
  applyProfile(u);
  if (u.equipped !== undefined && u.equipped !== store.get().settings.title) saveSettings({ title: u.equipped });
};
export const clearUser = () => store.set(s => ({ session: { ...s.session, guest: true, ign: guestIgn(), email: null }, profile: { rank: '未配置', lp: 0, streak: 0, titles: [] } }));

export function applySettings(s = store.get().settings) {
  const d = document.documentElement;
  d.dataset.theme = s.theme;
  d.dataset.fx = s.fx ? 'on' : 'off';
}
export function saveSettings(patch) {
  const settings = { ...store.get().settings, ...patch };
  write(SKEY, settings);
  store.set({ settings });
  applySettings(settings);
}

const setOnline = online => store.set(s => ({ session: { ...s.session, online } }));
addEventListener('online', () => setOnline(true));
addEventListener('offline', () => setOnline(false));
