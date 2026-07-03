# 第6段階 ゲーム終了・再戦・部屋を閉じる

## 目的

第5段階でゲーム中の質問・回答・結果確認フローが入ったため、第6段階ではゲーム終了後の導線を実装する。

## 対象機能

ゲーム終了時に以下を選択できるようにする。

1. 部屋を閉じる
2. 同じテーマで次のゲーム
3. テーマを変えて次のゲーム

## 部屋を閉じる

- ホストのみ実行可能。
- ルーム状態を `closed` にする。
- 参加者には最終結果画面を表示する。
- 以後、新規参加・ゲーム再開はできない。

## 同じテーマで次のゲーム

- ホストのみ実行可能。
- `themeText` は維持する。
- プレイヤーは維持する。
- `submittedTopic` と `assignedTopic` をクリアする。
- `status` を `waiting` に戻す。
- 全員が再度お題を提出してから開始する。

## テーマを変えて次のゲーム

- ホストのみ実行可能。
- 新しいテーマを入力する。
- プレイヤーは維持する。
- `submittedTopic` と `assignedTopic` をクリアする。
- `status` を `waiting` に戻す。
- 全員が再度お題を提出してから開始する。

## 最終結果表示

表示項目:

- 勝者
- 正解のお題
- 経過ターン
- 参加者一覧
- 質問履歴
- 解答履歴

## 追加予定API

```text
POST /rooms/:roomCode/close
POST /rooms/:roomCode/restart-same-theme
POST /rooms/:roomCode/restart-change-theme
```

## 次回実装方針

小分けで以下の順に反映する。

1. DTO追加
2. Controller API追加
3. Service処理追加
4. GameView終了画面更新
5. WaitingView再戦対応確認
6. CSS追加
