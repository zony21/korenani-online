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
    <div class="app-shell">
      <header class="app-header">
        <div class="logo">
          <span class="logo-icon">❔</span>
          <span><span class="logo-accent">これなに？</span><span class="logo-main">オンライン</span></span>
        </div>
        <button class="header-button" type="button">使い方 ？</button>
      </header>

      <section class="hero-card">
        <div>
          <h1 class="hero-title">
            <span class="grad-text">これなに？</span><br />
            オンライン
          </h1>

          <p class="hero-lead">
            みんなでお題の「これなに？」を当てる<br />
            オンラインクイズゲーム！
          </p>

          <div class="hero-actions">
            <button class="action-button action-blue" type="button" @click="onCreateRoom">
              👥
              <strong>
                ルームを作成する
                <span>入力内容で新しいルームを作成</span>
              </strong>
            </button>
          </div>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        </div>

        <div class="hero-illust">
          <div class="bubble one">💬</div>
          <div class="bubble two">😊</div>
          <div class="question-board">?</div>
          <div class="people-row">
            <div class="person">👦</div>
            <div class="person">👧</div>
            <div class="person">👨</div>
          </div>
        </div>
      </section>

      <section class="two-column" style="margin-top: 24px;">
        <div class="card">
          <h2 class="card-title blue">＋ ルームを作成</h2>

          <div class="form-row">
            <label for="hostName">あなたの名前</label>
            <input id="hostName" v-model="hostName" type="text" placeholder="例）あなたの名前" />
          </div>

          <div class="form-row">
            <label for="themeText">テーマ</label>
            <input id="themeText" v-model="themeText" type="text" placeholder="例）学校によくあるもの" />
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
              パスワードを設定する
            </label>
          </div>

          <div v-if="hasPassword" class="form-row">
            <label for="password">パスワード（5桁英数字）</label>
            <input id="password" v-model="password" type="text" maxlength="5" placeholder="例）A7K2P" />
          </div>

          <button class="secondary-button" type="button" @click="onCreateRoom">ルームを作成</button>
        </div>

        <div class="card">
          <h2 class="card-title green">遊び方</h2>
          <div class="feature-row" style="grid-template-columns: 1fr;">
            <div class="feature">
              <strong>簡単ルーム作成</strong>
              URLを共有するだけで参加できます。
            </div>
            <div class="feature">
              <strong>リアルタイム対戦</strong>
              参加メンバーがリアルタイムで増えます。
            </div>
            <div class="feature">
              <strong>次の段階</strong>
              ターン順・質問・回答を追加していきます。
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
