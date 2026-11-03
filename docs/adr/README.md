# Architecture Decision Records

更新日：2026-11-03

CaloriTypeの重要な設計判断について、背景・検討した選択肢・決定・理由と影響・未決事項を残す。初期段階ではプロダクトの計算や操作に関する判断も含める。

「採用」は会話で方針が合意されたことを表し、実装済み・安全性検証済み・未決事項まで確定済みという意味ではない。方式を変更するときは新しいADRから参照し、過去の判断を消さない。

| ADR | 決定 |
| --- | --- |
| [ADR-0001](0001-web-first-ios-later.md) | Webから開始し将来iOSへ展開する |
| [ADR-0002](0002-fast-manual-entry-and-reuse.md) | 手入力の速さと前回値の再利用を中心にする |
| [ADR-0003](0003-relative-portions-and-proportional-pfc.md) | 現在値を基準に量を調整しPFCも比例変更する |
| [ADR-0004](0004-per-day-boundary-and-meal-blocks.md) | 日ごとの終了境界と変更可能な食事ブロックを使う |
| [ADR-0005](0005-editable-goal-presets-with-history.md) | 体重目標から提案し編集可能な目標履歴を持つ |
| [ADR-0006](0006-completion-aware-calendar-budgets.md) | 記録完了日と暦の期間で調整予算を計算する |
| [ADR-0007](0007-local-storage-and-portable-backups.md) | 端末内保存から始めJSON復元を可能にする |

- [ADR-0008: 初期食品データを編集可能にし外食補正を別管理する](0008-editable-food-catalog-and-eating-out.md) — 採用
- [ADR-0009: 設定可能な1000操作の履歴と修復モードを備える](0009-configurable-history-repair-and-performance.md) — 採用
- [ADR-0010: 自律と継続を支える言葉を日替わりで表示する](0010-daily-verified-quotes.md) — 採用
- [ADR-0011: PFC自動推測を食品データ検索と軽量モデルで構成する案](0011-offline-pfc-retrieval-proposal.md) — 提案（未採用）

初版ADR-0002/0003/0004/0006/0007には追加合意を追記した。採用済みの要件と、ADR-0011のモデル構成の提案は区別する。

## 今後追加・具体化するADR

- 自動カロリー目標の計算式と適用条件。
- 食品データの出典、ライセンスと単位換算。
- 前回値の記憶と外食補正の未指定の詳細（初期率・範囲等）。
- 日付境界・タイムゾーン・隣接日の仕様。
- IndexedDBのスキーマ、JSONの版と原子的な復元、修復の具体方式。
- データ量・対象端末・性能目標と検証方法。
- オンライン同期の認証・認可・競合・削除。
- iOSの技術スタックとWebとの共有範囲。

上記には方針採用済みの項目の具体化も含む。詳細は[決定状況](../open-decisions.md)を参照。モデル選定・目標計算式・同期/iOSの具体方式は未決定。
