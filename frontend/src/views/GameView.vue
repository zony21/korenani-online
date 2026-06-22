<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getRoom } from '../api/roomApi';
import type { Room } from '../types/room';

const route = useRoute();
const roomCode = String(route.params.roomCode);

const room = ref<Room | null>(null);
const errorMessage = ref('');

onMounted(async () => {
  try {
    room.value = await getRoom(roomCode);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'ゲーム情報の取得に失敗しました。';
  }
});
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>ゲーム画面</h1>

      <template v-if="room">
        <p>テーマ：{{ room.themeText }}</p>
        <p>現在ターン：{{ room.currentTurn }} / {{ room.turnLimit }}</p>
        <p>ステータス：{{ room.status }}</p>
      </template>

      <p>第3段階でターン順・お題配布・タイマーを実装します。</p>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>
  </main>
</template>
