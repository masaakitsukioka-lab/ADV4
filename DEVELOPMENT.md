# サイカチADVの開発場所

今後は、どのPCでもExtreme SSD内の `ADV4` フォルダを開いて開発します。
GitHub: https://github.com/masaakitsukioka-lab/ADV4

作業前に、このフォルダで `git status` を確認し、未保存の変更がなければ `git pull --ff-only origin main` を実行します。
作業後は `git add .`、`git commit -m "変更内容"`、`git push origin main` を実行します。
各PCにはGitをインストールし、このリポジトリに書き込めるGitHubアカウントで認証してください。
SSDの接続パスはPCごとに異なるため、実際のADV4フォルダを選んでください。
別PCへの移動前には作業を保存し、SSDを安全に取り外してください。

検証:

```sh
node tests/conditions.cjs
node tests/story.cjs
```

`data/scenario.js` と `data/scenario.json` は同じ内容を保ちます。
過去版の配布ファイル・素材・テストは履歴とともに残しています。
単体HTMLとZIPは現行の編集用ファイルから自動更新されません。
