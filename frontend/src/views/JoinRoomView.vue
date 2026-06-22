<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getRoom, joinRoom } from '../api/roomApi';

const route = useRoute();
const router = useRouter();

const roomCode = String(route.params.roomCode);
const playerName = ref('');
const password = ref('');
const hasPassword = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  try {
    const room = await getRoom(roomCode);
    hasPassword.value = room.hasPassword;
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'ルーム情報の取得に失敗しました。';
  }
});

const onJoinRoom = async () => {
  errorMessage.value = '';

  try {
    const room = await joinRoom(roomCode, {
      playerName: playerName.value,
      password: hasPassword.value ? password.value : undefined,
    });

    const joinedPlayer = room.players[room.players.length - 1];
    localStorage.setItem(`room:${room.roomCode}:playerId`, String(joinedPlayer.id));
    router.push(`/room/${room.roomCode}`);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? '入室に失敗しました。';
  }
};
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>ルーム入室</h1>
      <p>ルームコード：{{ roomCode }}</p>

      <div class="form-row">
        <label for="playerName">名前</label>
        <input id="playerName" v-model="playerName" type="text" placeholder="例：はなこ" />
      </div>

      <div v-if="hasPassword" class="form-row">
        <label for="password">ルームパスワード</label>
        <input id="password" v-model="password" type="text" maxlength="5" />
      </div>

      <button type="button" @click="onJoinRoom">入室</button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>
  </main>
</template>
