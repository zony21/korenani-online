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
    <div class="app-shell">
      <header class="app-header">
        <div class="logo">
          <span class="logo-icon">❔</span>
          <span><span class="logo-accent">これなに？</span><span class="logo-main">オンライン</span></span>
        </div>
        <button class="header-button" type="button" @click="router.push('/')">ホームに戻る</button>
      </header>

      <section class="two-column">
        <div class="card">
          <h1 class="card-title green">👥 ルームに参加</h1>
          <p style="text-align: center; color: #475569;">ルームID：{{ roomCode }}</p>

          <div class="form-row">
            <label for="playerName">あなたの名前</label>
            <input id="playerName" v-model="playerName" type="text" placeholder="例）あなたの名前" />
          </div>

          <div v-if="hasPassword" class="form-row">
            <label for="password">ルームパスワード</label>
            <input id="password" v-model="password" type="text" maxlength="5" placeholder="5桁英数字" />
          </div>

          <button class="primary-button" type="button" @click="onJoinRoom">参加する</button>
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        </div>

        <div class="card">
          <h2 class="card-title blue">参加の流れ</h2>
          <div class="note-box">
            URLを開いて名前を入力すると、待機画面に参加者として表示されます。
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
