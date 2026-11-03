# GitHub Pages公開とモードの使い方

想定公開先：https://peketamin.github.io/CaloriType/  
これは設定後の想定URLであり、デプロイ成功の確認ではない。

## 公開手順

1. [Settings → Pages](https://github.com/peketamin/CaloriType/settings/pages)を開く。
2. Build and deploymentのSourceをGitHub Actionsにする。
3. Actionsで「Deploy CaloriType to GitHub Pages」を開き、必要ならRun workflowを実行する。
4. 実行結果とgithub-pages環境のURLを確認する。

ワークフローはmainのmockup/と自身の設定変更で自動実行される。公開するのはmockup/だけ。PRDやGit履歴全体を公開用アーティファクトには含めない。

現リポジトリは非公開。GitHubの契約が非公開リポジトリのPagesに対応している必要がある。Freeで利用する場合は公開リポジトリが必要になるが、リポジトリの可視性は自動変更しない。

## モード

- 初回はデモ。上部の選択欄でデモ/記録（試用）を切り替える。
- /CaloriType/?mode=demo はデモへ直接入るURL。既存の記録は消さない。
- 記録モードは食事・目標・体重が空から始まる。目標は手動設定。
- モードごとにIndexedDBの保存キーとセッション履歴を分ける。
- デモをリセットしても記録は変更しない。
- バックアップにmodeを付け、違うモードへの誤読み込みを拒否する。
- 旧モックのmodeのないファイルはデモとして読み込む。自動で本人の記録に割り当てない。
- モードを切り替える前に現在の保存を待つ。保存失敗時は切り替えず書き出しを案内する。

SitesからGitHub Pagesへはブラウザ保存が自動移行されない。必要なデータは旧画面からJSONを書き出して保管する。

## 公開前後に確認すること

- デモと記録を往復して、保存・履歴・復元が混ざらない。
- パス末尾 /CaloriType/ でCSSとJavaScriptが読み込まれる。
- モバイル幅でモード切り替えや入力が使える。
- 目標履歴などの未実装範囲は[仕様監査（リポジトリへのアクセスが必要）](https://github.com/peketamin/CaloriType/blob/main/docs/spec-audit.md)で把握する。記録側も本番品質が確認されたアプリではなく試用版。

## 公式資料

- [Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Actionsでの静的サイト公開](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
