タイピングバトル v0.6(オンライン対戦・ランク戦・サウンド)

■ 遊び方(オンライン対戦を含む)
  1. Node.js(バージョン20以上)をインストールする  https://nodejs.org
  2. このフォルダのサーバーを起動する
       Windows: start-server.bat をダブルクリック
       Mac    : start-server.command をダブルクリック(初回は右クリック→開く)
       どちらでも: ターミナルで  node server/server.js
  3. ブラウザで http://localhost:3000 を開く
  ※ ほかの人と対戦するには、このサーバーをインターネット上に置く(下の「公開するとき」)。
    同じネットワーク内なら、http://(このPCのIPアドレス):3000 で遊べる。
  ※ index.html を直接ダブルクリックして開いた場合は、トレーニング・図鑑・称号の確認だけ使える
    (アカウント・マッチング・ランク戦にはサーバーが必要)。

■ アカウント
  画面左上のボタンから、新規登録・ログイン。Gmailなど、どのメールアドレスでも使える
  (Gmailのドットと「+」以降は同じアドレスとして扱う)。確認メールは送らない。
  パスワードは8文字以上。サーバー側で scrypt によりハッシュ化して保存する。

■ 保存されるデータ
  data/db.json(アカウント・ランク・称号)。バックアップはこのファイルをコピーするだけ。

■ 公開するとき(インターネットに置く)
  ・Node.jsが動くサーバー(VPS、Render、Fly.io など)に、このフォルダ一式を置いて  node server/server.js  を実行
  ・必ず HTTPS で公開する(WebSocketは自動で wss:// になる)。ポートは環境変数 PORT で変更
  ・data/ フォルダは消えない場所(永続ディスク)に置く。環境変数 DB_FILE で保存先を変更できる
  ・サーバーは1台だけで動かす設計(複数台に分ける場合は、保存先とマッチングを共有化する必要がある)

■ テスト(Node.js)
  node tools/test.mjs          ローマ字判定・ダメージ・パッシブ
  node tools/test_rank.mjs     ランク戦(配置戦・昇格・降格戦・マッチング範囲)
  node tools/test_online.mjs   サーバーの通し確認(2人で対戦、CPU戦、切断)
  node tools/sim.mjs 300 0.97 300   キャラの総当たり勝率

■ 開発
  js/ を変更したら  python3 tools/bundle.py  で index.html を作り直す(dev.html は分割版)。
  js/engine/ はサーバーとブラウザで同じコードを使う(判定はサーバーが行う)。

■ 構成
  server/   server.js(HTTP・WebSocket)/ match.js(対戦の進行)/ queue.js(マッチング)/ rank.js(ランク)/ auth.js / titles_eval.js
  js/engine/ バトルのルール   js/net/ 通信   js/core/ 状態・音・アカウント   js/screens/ 各画面   js/data/ キャラ・単語・称号
