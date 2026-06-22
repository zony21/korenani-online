# お題当てゲーム 第1段階

## 実装範囲

- ルームを作る
- 入室URLを共有する
- 名前を入れて参加する
- 参加者がリアルタイムで増える
- ルームパスワード任意
- パスワードありの場合は5桁英数字
- 名前重複あり
- プレイヤー色分け

## 起動手順

### backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev
```

### frontend

```bash
cd frontend
npm install
npm run dev
```

## アクセス

```text
http://localhost:5173
```

## API

```text
POST /rooms
GET /rooms/:roomCode
POST /rooms/:roomCode/join
```

## Socket.IOイベント

```text
joinRoom
playersUpdated
```
