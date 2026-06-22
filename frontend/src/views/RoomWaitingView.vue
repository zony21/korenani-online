<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getRoom } from '../api/roomApi';
import { socket } from '../socket/socket';
import type { RoomPlayer } from '../types/room';

const route = useRoute();
const roomCode = String(route.params.roomCode);
const players = ref<RoomPlayer[]>([]);
const errorMessage = ref('');

const joinUrl = computed(() => `${window.location.origin}/join/${roomCode}`);

const copyJoinUrl = async () => {
  await navigator.clipboard.writeText(joinUrl.value);
  alert('入室URLをコピーしました。');
};

onMounted(async () => {
  try {
    const room = await getRoom(roomCode);
    players.value = room.players;

    socket.connect();
    socket.emit('joinRoom', { roomCode });
    socket.on('playersUpdated', (updatedPlayers: RoomPlayer[]) => {
      players.value = updatedPlayers;
    });
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'ルーム情報の取得に失敗しました。';
  }
});

onBeforeUnmount(() => {
  socket.off('playersUpdated');
  socket.disconnect();
});
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>待機画面</h1>
      <p>ルームコード：{{ roomCode }}</p>

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

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>
  </main>
</template>
