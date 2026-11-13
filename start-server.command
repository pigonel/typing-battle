#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js が見つかりません。https://nodejs.org からインストールしてください。"; read -r; exit 1; }
echo "ブラウザで http://localhost:3000 を開いてください(終了は Ctrl+C)"
node server/server.js
