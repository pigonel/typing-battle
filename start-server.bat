@echo off
chcp 65001 >nul
cd /d %~dp0
where node >nul 2>nul || (echo Node.js が見つかりません。https://nodejs.org からインストールしてください。 & pause & exit /b 1)
echo ブラウザで http://localhost:3000 を開いてください(終了は Ctrl+C)
node server\server.js
pause
