<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createRoom } from '../api/roomApi';

const router = useRouter();

const hostName = ref('');
const hasPassword = ref(false);
const password = ref('');
const topicMode = ref('free');
const themeText = ref('');
const turnLimit = ref(20);
const errorMessage = ref('');

const onCreateRoom = async () => {
  errorMessage.value = '';

  try {
    const room = await createRoom({
      hostName: hostName.value,
      hasPassword: hasPassword.value,
      password: hasPassword.value ? password.value : undefined,
      topicMode: topicMode.value,
      themeText: themeText.value,
      turnLimit: turnLimit.value,
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
        <label for="themeText">テーマ</label>
        <input id="themeText" v-model="themeText" type="text" placeholder="例：学校によくあるもの" />
      </div>

      <div class="form-row">
        <label for="topicMode">お題設定方式</label>
        <select id="topicMode" v-model="topicMode">
          <option value="free">自由入力</option>
          <option value="select">選択肢</option>
        </select>
      </div>

      <div class="form-row">
        <label for="turnLimit">ターン上限</label>
        <select id="turnLimit" v-model.number="turnLimit">
          <option :value="10">10ターン</option>
          <option :value="20">20ターン</option>
          <option :value="30">30ターン</option>
        </select>
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
