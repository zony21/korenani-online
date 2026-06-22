<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createRoom } from '../api/roomApi';

const router = useRouter();

const hostName = ref('');
const hasPassword = ref(false);
const password = ref('');
const errorMessage = ref('');

const onCreateRoom = async () => {
  errorMessage.value = '';

  try {
    const room = await createRoom({
      hostName: hostName.value,
      hasPassword: hasPassword.value,
      password: hasPassword.value ? password.value : undefined,
    });

    localStorage.setItem(`room:${room.roomCode}:playerId`, String(room.players[0].id));
    router.push(`/room/${room.roomCode}`);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'ルーム作成に失敗しました。';
  }
};
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>ルーム作成</h1>

      <div class="form-row">
        <label for="hostName">部屋作成者の名前</label>
        <input id="hostName" v-model="hostName" type="text" placeholder="例：たろう" />
      </div>

      <div class="form-row">
        <label>
          <input v-model="hasPassword" type="checkbox" style="width: auto" />
          ルームパスワードを設定する
        </label>
      </div>

      <div v-if="hasPassword" class="form-row">
        <label for="password">パスワード（5桁英数字）</label>
        <input id="password" v-model="password" type="text" maxlength="5" placeholder="例：A7K2P" />
      </div>

      <button type="button" @click="onCreateRoom">ルームを作成</button>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>
  </main>
</template>
