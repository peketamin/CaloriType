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

## 今後追加するADR

- 自動カロリー目標の計算式と適用条件。
- 食品データの出典、ライセンスと単位換算。
- 前回値の記憶ルール、外食補正の計算方法。
- 日付境界・タイムゾーン・隣接日の仕様。
- 永続化方式、JSONのスキーマと復元戦略。
- データ量・対象端末・性能目標と検証方法。
- オンライン同期の認証・認可・競合・削除。
- iOSの技術スタックとWebとの共有範囲。

上記は未決事項であり、技術選定済みではない。
