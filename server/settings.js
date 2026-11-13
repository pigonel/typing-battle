// アカウントごとの設定の検証(許可した項目だけを受け付ける)
export function cleanSettings(inp, u) {
  const s = inp && typeof inp === 'object' ? inp : {}, out = { ...(u.settings ?? {}) };
  if (typeof s.fx === 'boolean') out.fx = s.fx;
  for (const k of ['bgm', 'se']) if (Number.isFinite(s[k])) out[k] = Math.min(100, Math.max(0, Math.round(s[k])));
  if (s.theme === 'dark' || s.theme === 'light') out.theme = s.theme;
  if (s.hud && typeof s.hud === 'object') out.hud = Object.fromEntries(['ign', 'rank', 'title', 'streak'].map(k => [k, typeof s.hud[k] === 'boolean' ? s.hud[k] : (out.hud?.[k] ?? true)]));
  const keyOk = k => typeof k === 'string' && /^(Alt\+)?(Shift\+)?[A-Za-z][A-Za-z0-9]{1,15}$/.test(k) && /^(Alt|Shift)/.test(k);
  if (Array.isArray(s.skillKeys) && s.skillKeys.length === 2 && s.skillKeys.every(keyOk) && s.skillKeys[0] !== s.skillKeys[1]) out.skillKeys = s.skillKeys;
  if ('title' in s) out.title = s.title && u.titles.includes(s.title) ? s.title : null; // 持っていない称号は装備できない
  return out;
}
