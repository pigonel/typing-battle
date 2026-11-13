// キャラのイラスト(オリジナルのSVG)。右向きに描いてあり、右側のキャラは画面側で反転する。
// 画像素材に差し替えるときは charArt() の中身だけ変えればよい。
const wrap = (label, inner) => `<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}"><ellipse cx="100" cy="248" rx="64" ry="9" fill="#000" opacity=".3"/>${inner}</svg>`;

export const ACCENT = { thief: '#2fc4d2', golem: '#5ef2ff', saint: '#ffd23f', wolf: '#ffe66d', witch: '#b57cff', ogre: '#9bd45a', monk: '#ff6a5a', phantom: '#8d7bff' };

const ART = {
  thief: `<path d="M50 246 L62 140 Q100 114 138 140 L152 246Z" fill="#1f6f78"/><path d="M104 124 Q122 130 138 140 L152 246 L104 246Z" fill="#175862"/>
    <path d="M66 134 Q100 156 134 132 L140 152 Q100 176 62 154Z" fill="#ffd23f"/><path d="M124 150 L150 206 L130 200 L116 160Z" fill="#e8a800"/>
    <path d="M58 114 Q54 50 100 38 Q146 50 142 114 Q122 98 100 98 Q78 98 58 114Z" fill="#2aa3b0"/><path d="M100 38 Q146 50 142 114 Q122 98 100 98Z" fill="#1f8793"/>
    <path d="M70 108 Q100 84 132 108 Q126 130 100 132 Q76 130 70 108Z" fill="#0b2a30"/><path d="M80 108 L98 112 L96 119 L80 115Z M122 108 L104 112 L106 119 L122 115Z" fill="#ffe66d"/>
    <path d="M154 156 L190 104 L197 110 L162 166Z" fill="#dfe7f2"/><path d="M154 156 L162 166 L150 178 L140 168Z" fill="#7a4b2a"/>
    <path d="M44 176 L12 126 L20 120 L54 168Z" fill="#c4cfde"/><path d="M44 176 L54 168 L66 178 L54 190Z" fill="#7a4b2a"/>`,
  golem: `<rect x="46" y="120" width="108" height="120" rx="16" fill="#8a8f9c"/><path d="M100 120 H138 a16 16 0 0 1 16 16 V224 a16 16 0 0 1 -16 16 H100Z" fill="#6c717e"/>
    <rect x="70" y="58" width="60" height="58" rx="12" fill="#9aa0ae"/><path d="M100 58 H118 a12 12 0 0 1 12 12 V104 a12 12 0 0 1 -12 12 H100Z" fill="#7d8391"/>
    <rect x="79" y="80" width="15" height="9" rx="3" fill="#5ef2ff"/><rect x="106" y="80" width="15" height="9" rx="3" fill="#5ef2ff"/>
    <path d="M100 140 v52 M84 160 h32 M88 208 l12 -14 12 14" stroke="#5ef2ff" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="12" y="132" width="40" height="92" rx="16" fill="#7a808d"/><rect x="6" y="206" width="54" height="40" rx="14" fill="#9aa0ae"/>
    <rect x="148" y="132" width="40" height="92" rx="16" fill="#636874"/><rect x="142" y="206" width="54" height="40" rx="14" fill="#7d8391"/>
    <path d="M58 124 q10 -12 22 0 q-11 9 -22 0z" fill="#5fa85a"/><path d="M120 62 q8 -8 16 0 q-8 6 -16 0z" fill="#5fa85a"/>`,
  saint: `<ellipse cx="100" cy="26" rx="34" ry="9" fill="none" stroke="#ffd23f" stroke-width="5"/>
    <path d="M56 246 L68 138 Q100 118 132 138 L144 246Z" fill="#f3f0ff"/><path d="M102 126 L132 138 L144 246 L102 246Z" fill="#d9d2f7"/>
    <path d="M70 140 L100 204 L130 140 L118 138 L100 172 L82 138Z" fill="#ffd23f"/>
    <path d="M60 124 Q52 50 100 44 Q148 50 140 124 Q130 100 100 100 Q70 100 60 124Z" fill="#9a84ee"/>
    <ellipse cx="100" cy="92" rx="26" ry="30" fill="#ffe0c7"/><path d="M72 86 Q100 38 128 86 Q112 66 100 70 Q88 66 72 86Z" fill="#b8a1ff"/>
    <path d="M86 94 q6 5 12 0 M104 94 q6 5 12 0" stroke="#5a3d7a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M94 110 q6 5 12 0" stroke="#c0607a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="156" y="72" width="6" height="174" rx="3" fill="#e8a800"/><circle cx="159" cy="62" r="15" fill="#ffd23f"/><circle cx="159" cy="62" r="7" fill="#fff6b0"/><circle cx="159" cy="152" r="9" fill="#ffe0c7"/>`,
  wolf: `<path d="M44 246 L58 152 Q100 128 142 152 L156 246Z" fill="#33407f"/><path d="M80 150 L100 208 L120 150Z" fill="#e9efff"/>
    <path d="M140 172 l-20 28 h14 l-12 28 32 -38 h-16 l10 -18z" fill="#ffd23f"/>
    <path d="M58 104 L50 38 L84 66 Q100 60 116 66 L150 38 L142 104 Q146 144 100 154 Q54 144 58 104Z" fill="#4a5cb0"/>
    <path d="M62 66 L60 50 L76 68Z M138 66 L140 50 L124 68Z" fill="#ffd23f"/>
    <ellipse cx="100" cy="126" rx="28" ry="21" fill="#e9efff"/><path d="M91 114 h18 l-9 10z" fill="#1b1f4b"/>
    <path d="M72 94 l22 6 -4 9 -20 -6z M128 94 l-22 6 4 9 20 -6z" fill="#ffe66d"/><circle cx="88" cy="103" r="3" fill="#1b1f4b"/><circle cx="112" cy="103" r="3" fill="#1b1f4b"/>
    <path d="M88 134 l5 14 5 -14z M102 134 l5 14 5 -14z" fill="#fff"/>`,
  witch: `<path d="M46 246 L60 144 Q100 120 140 144 L154 246Z" fill="#3d2a6b"/><path d="M104 128 Q124 132 140 144 L154 246 L104 246Z" fill="#2e1f54"/>
    <path d="M84 140 L100 178 L116 140Z" fill="#6bff95" opacity=".85"/>
    <path d="M62 118 Q58 154 72 172 Q64 130 74 110Z M138 118 Q142 154 128 172 Q136 130 126 110Z" fill="#2a1a40"/>
    <ellipse cx="100" cy="106" rx="25" ry="27" fill="#f4d3b4"/><path d="M76 100 Q100 78 124 100 Q112 92 100 96 Q88 92 76 100Z" fill="#2a1a40"/>
    <path d="M84 106 q6 -5 12 0 M104 106 q6 -5 12 0" stroke="#2a1a40" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M92 120 q8 7 16 0" stroke="#a23a5a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M36 82 Q100 62 164 82 Q132 96 100 96 Q68 96 36 82Z" fill="#5b3a9a"/><path d="M70 82 L106 6 Q118 4 120 18 Q126 54 134 82Z" fill="#6a45b3"/><path d="M76 70 L132 70 L134 82 L72 82Z" fill="#ffd23f"/>
    <circle cx="159" cy="206" r="28" fill="#6bff95" opacity=".2"/><path d="M152 170 h14 v12 l14 22 a18 18 0 0 1 -42 0 l14 -22z" fill="#6bff95"/><rect x="153" y="160" width="12" height="12" fill="#8b5a2b"/><circle cx="159" cy="176" r="9" fill="#f4d3b4" opacity="0"/>`,
  ogre: `<path d="M36 246 L46 142 Q100 116 154 142 L164 246Z" fill="#78b04a"/><path d="M104 126 Q132 130 154 142 L164 246 L104 246Z" fill="#5c8e38"/><ellipse cx="100" cy="206" rx="34" ry="26" fill="#9acb66"/>
    <path d="M60 142 L140 222 L152 208 L74 134Z" fill="#7a4b2a"/>
    <ellipse cx="100" cy="94" rx="42" ry="38" fill="#78b04a"/><path d="M62 84 Q100 66 138 84 L136 96 Q100 80 64 96Z" fill="#4a7a2a"/>
    <path d="M70 66 L58 26 L86 56Z M130 66 L142 26 L114 56Z" fill="#f1ead2"/>
    <path d="M76 98 l16 5 M124 98 l-16 5" stroke="#2a1a10" stroke-width="5" stroke-linecap="round"/><circle cx="87" cy="104" r="4" fill="#ffe66d"/><circle cx="113" cy="104" r="4" fill="#ffe66d"/>
    <path d="M74 118 Q100 134 126 118 Q112 126 100 126 Q88 126 74 118Z" fill="#3a1f1a"/><path d="M82 120 l-3 -18 l11 15z M118 120 l3 -18 l-11 15z" fill="#f1ead2"/>
    <g transform="rotate(24 172 150)"><rect x="162" y="52" width="22" height="160" rx="9" fill="#8b5a2b"/><circle cx="173" cy="62" r="20" fill="#9a6a38"/><path d="M160 54 l-8 -6 M186 54 l8 -6 M173 40 v-10" stroke="#d9d2c0" stroke-width="5" stroke-linecap="round"/></g>`,
  monk: `<path d="M50 246 L62 142 Q100 122 138 142 L150 246Z" fill="#d9453d"/><path d="M102 128 L138 142 L150 246 L102 246Z" fill="#b53630"/>
    <path d="M82 138 L100 192 L118 138 L108 136 L100 162 L92 136Z" fill="#f1c6a0"/><rect x="60" y="198" width="80" height="14" rx="3" fill="#f4f4f4"/>
    <path d="M52 152 L30 178 L46 190 L66 170Z" fill="#d9453d"/><circle cx="36" cy="182" r="19" fill="#f1c6a0"/><path d="M24 176 h24 M22 186 h28" stroke="#f4f4f4" stroke-width="5"/>
    <path d="M138 152 L164 150 L162 172 L140 170Z" fill="#b53630"/><circle cx="168" cy="160" r="19" fill="#f1c6a0"/><path d="M156 154 h24 M156 164 h24" stroke="#f4f4f4" stroke-width="5"/>
    <ellipse cx="100" cy="92" rx="26" ry="30" fill="#f1c6a0"/>
    <path d="M70 82 L64 42 L84 62 L92 32 L104 60 L120 36 L126 64 L144 48 L130 92 Q100 64 70 82Z" fill="#1d1a2f"/>
    <path d="M72 80 Q100 64 128 80 L128 90 Q100 76 72 90Z" fill="#f4f4f4"/><path d="M72 86 L44 100 L52 84 L70 78Z" fill="#f4f4f4"/>
    <path d="M84 98 l12 -3 M104 95 l12 3" stroke="#1d1a2f" stroke-width="4" stroke-linecap="round"/><path d="M92 114 q8 4 16 0" stroke="#8a4a3a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  phantom: `<path d="M48 238 Q52 152 70 122 Q100 98 130 122 Q148 152 152 238 Q140 226 128 240 Q116 226 100 242 Q84 226 72 240 Q60 228 48 238Z" fill="#6c4fe0" opacity=".92"/>
    <path d="M102 112 Q130 122 152 238 Q140 226 128 240 Q116 226 102 242Z" fill="#5236c4" opacity=".7"/>
    <path d="M62 108 Q60 46 100 38 Q140 46 138 108 Q120 90 100 90 Q80 90 62 108Z" fill="#8466ff"/>
    <ellipse cx="100" cy="94" rx="27" ry="23" fill="#14102b"/><ellipse cx="90" cy="92" rx="6" ry="9" fill="#5ef2ff"/><ellipse cx="110" cy="92" rx="6" ry="9" fill="#5ef2ff"/>
    <path d="M54 150 Q20 172 26 218 Q44 204 62 190Z" fill="#7a5cf0"/><path d="M26 218 l-8 14 M34 214 l-4 16 M42 208 l2 16" stroke="#cdbfff" stroke-width="4" stroke-linecap="round"/>
    <path d="M148 140 q34 22 12 74" stroke="#cfd8e6" stroke-width="5" fill="none" stroke-dasharray="9 5" stroke-linecap="round"/><circle cx="160" cy="216" r="9" fill="none" stroke="#cfd8e6" stroke-width="5"/>`,
};

export const charArt = c => wrap(c.name, ART[c.id]);
