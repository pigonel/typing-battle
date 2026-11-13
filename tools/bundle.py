"""js/ 以下のモジュールと css を1つにまとめて index.html を作る(ダブルクリックで動く版)。
使い方: python3 tools/bundle.py   ※ 開発用の dev.html は ローカルサーバー経由で開く"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
SCREENS = ['menu', 'settings', 'training', 'battle', 'matching', 'draft', 'vs', 'result', 'codex', 'titles']
ORDER = ['js/core/dom.js', 'js/core/store.js', 'js/data/titles.js', 'js/core/state.js', 'js/core/router.js', 'js/core/auth.js', 'js/net/conn.js', 'js/core/audio.js', 'js/core/account_ui.js',
         'js/engine/rules.js', 'js/engine/rng.js', 'js/engine/romaji.js', 'js/engine/battle.js', 'js/engine/bot.js', 'js/engine/feed.js',
         'js/data/menu.js', 'js/data/characters.js', 'js/data/words.js', 'js/data/presets.js', 'js/data/art.js',
         'js/screens/battle_fx.js'] + [f'js/screens/{n}.js' for n in SCREENS] + ['js/main.js']
DEFAULT_NAMES = {f'js/screens/{n}.js': f'{n}Screen' for n in SCREENS}

def convert(path):
    src = (root / path).read_text(encoding='utf-8')
    src = re.sub(r'^import .*?;[ \t]*$', '', src, flags=re.M)
    if path in DEFAULT_NAMES:
        src = src.replace('export default {', f'const {DEFAULT_NAMES[path]} = {{', 1)
    src = re.sub(r'^export (const|let|function) ', r'\1 ', src, flags=re.M)
    if path == 'js/main.js':
        src = re.sub(r'registerScreens\(\{.*?\}\);', 'registerScreens({ ' + ', '.join(f'{n}: {n}Screen' for n in SCREENS) + ' });', src, flags=re.S)
    return f'// ---- {path}\n{src}'

js = "(() => {\n'use strict';\n" + "\n".join(convert(p) for p in ORDER) + "\n})();\n"
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'bundle.js').write_text(js, encoding='utf-8')
html = (root / 'dev.html').read_text(encoding='utf-8')
css = (root / 'css/style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="css/style.css">', f'<style>\n{css}</style>')
html = html.replace('<script type="module" src="js/main.js"></script>', f'<script>\n{js}</script>')
(root / 'index.html').write_text(html, encoding='utf-8')
print('index.html を作成しました')
