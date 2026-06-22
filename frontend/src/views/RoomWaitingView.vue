<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getRoom, startRoom, submitTopic } from '../api/roomApi';
import { socket } from '../socket/socket';
import type { Room, RoomPlayer } from '../types/room';

const route = useRoute();
const router = useRouter();

const roomCode = String(route.params.roomCode);
const room = ref<Room | null>(null);
const players = ref<RoomPlayer[]>([]);
const topicText = ref('');
const errorMessage = ref('');
const successMessage = ref('');

const joinUrl = computed(() => `${window.location.origin}/join/${roomCode}`);

const myPlayerId = computed(() => {
  const value = localStorage.getItem(`room:${roomCode}:playerId`);
  return value ? Number(value) : null;
});

const myPlayer = computed(() => {
  return players.value.find((player) => player.id === myPlayerId.value);
});

const isHost = computed(() => {
  return myPlayer.value?.isHost === true;
});

const allSubmitted = computed(() => {
  return players.value.length >= 2 && players.value.every((player) => !!player.submittedTopic?.trim());
});

const canStart = computed(() => {
  return players.value.length >= 2 && allSubmitted.value;
});

const submittedCount = computed(() => {
  return players.value.filter((player) => !!player.submittedTopic?.trim()).length;
});

const copyJoinUrl = async () => {
  await navigator.clipboard.writeText(joinUrl.value);
  alert('入室URLをコピーしました。');
};

const onSubmitTopic = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  if (!myPlayerId.value) {
    errorMessage.value = 'プレイヤー情報が見つかりません。入室し直してください。';
    return;
  }

  try {
    const updatedRoom = await submitTopic(roomCode, {
      playerId: myPlayerId.value,
      topic: topicText.value,
    });

    room.value = updatedRoom;
    players.value = updatedRoom.players;
    successMessage.value = 'お題を提出しました。';
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'お題提出に失敗しました。';
  }
};

const onStartRoom = async () => {
  errorMessage.value = '';

  try {
    const startedRoom = await startRoom(roomCode);
    room.value = startedRoom;
    router.push(`/game/${roomCode}`);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'ゲーム開始に失敗しました。';
  }
};

onMounted(async () => {
  try {
    const currentRoom = await getRoom(roomCode);
    room.value = currentRoom;
    players.value = currentRoom.players;
    topicText.value = myPlayer.value?.submittedTopic ?? '';

    socket.connect();
    socket.emit('joinRoom', { roomCode });

    socket.on('playersUpdated', (updatedPlayers: RoomPlayer[]) => {
      players.value = updatedPlayers;
    });

    socket.on('gameUpdated', (updatedRoom: Room) => {
      room.value = updatedRoom;
      players.value = updatedRoom.players;
      topicText.value = updatedRoom.players.find((player) => player.id === myPlayerId.value)?.submittedTopic ?? topicText.value;
    });

    socket.on('roomStarted', () => {
      router.push(`/game/${roomCode}`);
    });
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'ルーム情報の取得に失敗しました。';
  }
});

onBeforeUnmount(() => {
  socket.off('playersUpdated');
  socket.off('gameUpdated');
  socket.off('roomStarted');
  socket.disconnect();
});
</script>

<template>
  <main class="page">
    <div class="app-shell">
      <header class="app-header">
        <div class="logo">
          <span class="logo-icon">❔</span>
          <span><span class="logo-accent">これなに？</span><span class="logo-main">オンライン</span></span>
        </div>
        <button class="header-button" type="button" @click="router.push('/')">ホームに戻る</button>
      </header>

      <section class="waiting-grid">
        <div class="info-panel">
          <h2 style="text-align: center;">ルームID</h2>
          <div class="room-code">{{ roomCode }}</div>
          <button class="copy-small" type="button" @click="copyJoinUrl">コピー</button>

          <div class="note-box">
            このURLを共有してメンバーを招待しよう！
            <input :value="joinUrl" readonly style="margin-top: 12px;" />
          </div>
        </div>

        <div class="member-panel">
          <h2>参加メンバー（{{ players.length }}/9人）</h2>
          <p style="color: #475569;">お題提出：{{ submittedCount }} / {{ players.length }}</p>

          <ul class="player-list">
            <li v-for="player in players" :key="player.id" class="player-item">
              <span class="color-dot" :style="{ backgroundColor: player.playerColor }"></span>
              <span>{{ player.playerName }}</span>
              <span v-if="player.isHost" class="badge">ホスト</span>
              <span v-if="player.submittedTopic" class="badge">提出済</span>
            </li>
          </ul>

          <div class="topic-submit-box">
            <h3>あなたが出すお題</h3>
            <p>
              このお題は、あなた以外の誰かに配られます。あなた自身には配られません。
            </p>
            <input v-model="topicText" type="text" placeholder="例）黒板、チョーク、給食" />
            <button class="secondary-button" type="button" style="margin-top: 12px;" @click="onSubmitTopic">
              お題を提出
            </button>
            <p v-if="successMessage" style="color: #059669; font-weight: 800;">{{ successMessage }}</p>
          </div>
        </div>

        <div class="setting-panel">
          <h2>ルーム設定</h2>

          <template v-if="room">
            <p>テーマ：{{ room.themeText }}</p>
            <p>お題方式：{{ room.topicMode === 'free' ? '自由入力' : '選択肢' }}</p>
            <p>ターン上限：{{ room.turnLimit }}ターン</p>
            <p>パスワード：{{ room.hasPassword ? 'あり' : 'なし' }}</p>
          </template>

          <button
            v-if="isHost"
            class="primary-button"
            type="button"
            :disabled="!canStart"
            @click="onStartRoom"
          >
            ▶ ゲームを開始
          </button>

          <p v-if="isHost && players.length < 2">2人以上集まると開始できます。</p>
          <p v-if="isHost && players.length >= 2 && !allSubmitted">全員がお題を提出すると開始できます。</p>
          <p v-if="!isHost">作成者がゲームを開始するまでお待ちください。</p>

          <button class="danger-button" type="button" style="margin-top: 14px;" @click="router.push('/')">
            ルームを退出
          </button>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        </div>
      </section>

      <div class="note-box">
        <strong>お題ルール</strong><br />
        自分が提出したお題は自分には来ません。自分に配られたお題を、質問しながら当てます。
      </div>
    </div>
  </main>
</template>
