// サーバーとの通信(WebSocket)。ファイルを直接開いている場合(サーバーなし)は接続しない
import { store, applyUser, applyProfile } from '../core/state.js';

const LISTENERS = new Map();
export const LAST = {}; // 種類ごとの最新メッセージ(画面の切り替え中に届いたものを拾うため)
let sock = null, retry = 0, wanted = false, seqNo = 0, retryTimer = 0;
const emit = (type, m) => [...(LISTENERS.get(type) ?? [])].forEach(fn => fn(m));
const setServer = on => { if (store.get().session.server !== on) store.set(s => ({ session: { ...s.session, server: on } })); };

export const conn = {
  get seq() { return seqNo; },
  get open() { return sock?.readyState === 1; },
  on(type, fn) { const set = LISTENERS.get(type) ?? new Set(); set.add(fn); LISTENERS.set(type, set); return () => set.delete(fn); },
  send(o) { if (sock?.readyState === 1) sock.send(JSON.stringify(o)); },
  connect() {
    if (location.protocol === 'file:') { setServer(false); return; }
    wanted = true; clearTimeout(retryTimer);
    if (sock && sock.readyState <= 1) return;
    const s = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    sock = s;
    s.onopen = () => {
      retry = 0;
      let token = null; try { token = localStorage.getItem('tb.token'); } catch { /* 無視 */ }
      s.send(JSON.stringify({ t: 'hello', token, guest: store.get().session.ign }));
    };
    s.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      m.seq = ++seqNo; LAST[m.t] = m;
      if (m.t === 'hello_ok') { setServer(true); if (m.user) applyUser(m.user); }
      else if (m.t === 'profile' && m.user) applyProfile(m.user);
      emit(m.t, m);
    };
    s.onclose = () => { setServer(false); emit('_close', {}); if (wanted && sock === s) retryTimer = setTimeout(() => conn.connect(), Math.min(8000, 800 * 2 ** retry++)); };
    s.onerror = () => {};
  },
  reconnect() { const old = sock; sock = null; if (old) { old.onclose = null; try { old.close(); } catch { /* 無視 */ } } conn.connect(); },
};
