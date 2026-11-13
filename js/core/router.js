// 画面 = { mount(el, ctx) => cleanup }。画面遷移はgo(id)だけ。
import { store } from './state.js';

const screens = new Map();
let root = null, cleanup = null;

export const registerScreens = obj => Object.entries(obj).forEach(([id, mod]) => screens.set(id, mod));

export function go(id, params = {}) {
  const mod = screens.get(id);
  if (!mod) throw new Error(`未登録の画面: ${id}`);
  cleanup?.();
  root.innerHTML = '';
  const el = document.createElement('section');
  el.className = 'screen';
  el.dataset.screen = id;
  root.append(el);
  store.set({ screen: id, params });
  cleanup = mod.mount(el, { store, go, params }) ?? null;
}

export function startRouter(el, first = 'menu') { root = el; go(first); }
