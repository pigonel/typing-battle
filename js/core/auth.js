// アカウント(メール+パスワード)。サーバーのAPIを呼ぶ。Gmailなど任意のメールアドレスで登録できる
export const IGN_RE = /^[A-Za-z0-9_.-]{3,16}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const NO_SERVER = 'サーバーに接続できません。サーバーを起動して、ブラウザで http://localhost:3000 を開いてください(ファイルを直接開いている間は、アカウントを使えません)';

export function validate({ email = '', password = '', password2 = '', ign = '' }, register) {
  if (!EMAIL_RE.test(email.trim())) return 'メールアドレスの形式が正しくありません';
  if (register && !IGN_RE.test(ign)) return 'プレイヤー名は3〜16文字の英数字と _ - . だけ使えます';
  if (password.length < 8) return 'パスワードは8文字以上にしてください';
  if (register && password !== password2) return 'パスワードが一致しません';
  return '';
}
const getToken = () => { try { return localStorage.getItem('tb.token'); } catch { return null; } };
const setToken = t => { try { t ? localStorage.setItem('tb.token', t) : localStorage.removeItem('tb.token'); } catch { /* 無視 */ } };

async function api(path, method, body) {
  if (location.protocol === 'file:') return { error: NO_SERVER };
  try {
    const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json();
    return r.ok ? j : { error: j.error || 'エラーが発生しました', status: r.status };
  } catch { return { error: NO_SERVER }; }
}

export const Auth = {
  async register({ email, password, ign }) { const r = await api('/api/register', 'POST', { email: email.trim(), password, ign }); if (r.token) setToken(r.token); return r.error ? { error: r.error } : { user: r.user }; },
  async login({ email, password }) { const r = await api('/api/login', 'POST', { email: email.trim(), password }); if (r.token) setToken(r.token); return r.error ? { error: r.error } : { user: r.user }; },
  async logout() { await api('/api/logout', 'POST', {}); setToken(null); },
  async restore() {
    if (!getToken()) return null;
    const r = await api('/api/me', 'GET');
    if (r.status === 401) setToken(null);
    return r.user ?? null;
  },
};
export const restoreSession = () => Auth.restore();
