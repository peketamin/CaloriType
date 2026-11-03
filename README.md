# CaloriType（カロリタイプ）

カロリー管理。手入力と前回値の補完で、食べた量に合わせてすばやく記録するアプリです。最初はWebで検証し、将来iOSへ展開します。

## 現在の状態

要件定義・操作設計の段階です。[操作モックを非公開URLで確認できます](https://calorie-note-mockup-k7m3.peketamin.chatgpt.site)。本番アプリは未完成です。モックのソースと確認方法は[mockup/README.md](mockup/README.md)を参照してください。

## 文書

- [PRD：製品要件・デザイン](docs/design.md)：目的、利用者、仮説、成功基準、範囲、User stories、仕様、未決事項
- [技術設計](docs/technical-design.md)：計算、データ、保存・修復、性能の具体化
- [決定状況と残る具体化](docs/open-decisions.md)：採用した20項目と詳細の残件
- [PFCの技術調査](docs/offline-pfc.md)：未採用のモデル案と調査根拠
- [ADR](docs/adr/README.md)：代替案を退けた理由と不利益を残す5本
- [ロードマップ](docs/roadmap.md)：段階開発。リリース日や費用は未確定

PRDはAtlassianの公開テンプレートを基に整理しています。採用済みの要件、具体化の提案、未検証の仮説を分け、機能仕様をADRへ重複させない方針です。
