# 第2段階 上書き適用手順

このZIPは、既存の第1段階プロジェクトに上書きするためのファイルのみを含みます。

## 適用方法

1. ZIPをプロジェクトルート `korenani-online/` に展開
2. 既存ファイルはすべて上書き
3. backendでPrismaマイグレーション実行

```bash
cd backend
npx prisma migrate dev --name add_game_setup_fields
npm run start:dev
```

4. frontend起動

```bash
cd frontend
npm run dev
```

## 第2段階で追加される内容

- passwordHashをフロントへ返さない
- ルーム作成時にテーマ入力
- お題設定方式の選択
- ターン上限 10/20/30
- 待機画面にテーマ・ターン上限表示
- 作成者のみゲーム開始可能
- 2人以上でゲーム開始可能
- ゲーム開始後 `/game/:roomCode` へ遷移
