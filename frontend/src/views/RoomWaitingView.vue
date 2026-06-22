<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getRoom, startRoom } from '../api/roomApi';
import { socket } from '../socket/socket';
import type { Room, RoomPlayer } from '../types/room';

const route = useRoute();
const router = useRouter();

const roomCode = String(route.params.roomCode);
const room = ref<Room | null>(null);
const players = ref<RoomPlayer[]>([]);
const errorMessage = ref('');

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

const canStart = computed(() => {
  return players.value.length >= 2;
});

const copyJoinUrl = async () => {
  await navigator.clipboard.writeText(joinUrl.value);
  alert('入室URLをコピーしました。');
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

    socket.connect();
    socket.emit('joinRoom', { roomCode });

    socket.on('playersUpdated', (updatedPlayers: RoomPlayer[]) => {
      players.value = updatedPlayers;
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
  socket.off('roomStarted');
  socket.disconnect();
});
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>待機画面</h1>

      <p>ルームコード：{{ roomCode }}</p>

      <template v-if="room">
        <p>テーマ：{{ room.themeText }}</p>
        <p>お題設定方式：{{ room.topicMode === 'free' ? '自由入力' : '選択肢' }}</p>
        <p>ターン上限：{{ room.turnLimit }}ターン</p>
      </template>

      <div class="form-row">
        <label>入室URL</label>
        <input :value="joinUrl" readonly />
      </div>

      <button type="button" @click="copyJoinUrl">URLをコピー</button>

      <h2>参加者一覧</h2>

      <ul class="player-list">
        <li v-for="player in players" :key="player.id" class="player-item">
          <span class="color-dot" :style="{ backgroundColor: player.playerColor }"></span>
          <span>{{ player.playerName }}</span>
          <strong v-if="player.isHost">作成者</strong>
        </li>
      </ul>

      <div v-if="isHost" class="form-row">
        <button type="button" :disabled="!canStart" @click="onStartRoom">
          ゲーム開始
        </button>

        <p v-if="!canStart">2人以上集まると開始できます。</p>
      </div>

      <p v-if="!isHost">作成者がゲームを開始するまでお待ちください。</p>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>
  </main>
</template>
