<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { advanceTurn, createGameAction, getRoom } from '../api/roomApi';
import { socket } from '../socket/socket';
import type { Room } from '../types/room';

const TURN_SECONDS = 180;

const route = useRoute();
const router = useRouter();
const roomCode = String(route.params.roomCode);

const room = ref<Room | null>(null);
const errorMessage = ref('');
const actionType = ref<'question' | 'guess'>('question');
const actionText = ref('');
const now = ref(Date.now());
const isAdvancingTimeout = ref(false);

let timerId: number | undefined;

const myPlayerId = computed(() => {
  const value = localStorage.getItem(`room:${roomCode}:playerId`);
  return value ? Number(value) : null;
});

const myPlayer = computed(() => {
  return room.value?.players.find((player) => player.id === myPlayerId.value) ?? null;
});

const currentPlayer = computed(() => {
  if (!room.value) {
    return null;
  }
  return room.value.players[room.value.currentPlayerIndex] ?? null;
});

const isMyTurn = computed(() => {
  return currentPlayer.value?.id === myPlayerId.value && room.value?.status === 'playing';
});

const remainingSeconds = computed(() => {
  if (!room.value?.turnStartedAt || room.value.status !== 'playing') {
    return TURN_SECONDS;
  }

  const startedAt = new Date(room.value.turnStartedAt).getTime();
  const elapsed = Math.floor((now.value - startedAt) / 1000);
  return Math.max(TURN_SECONDS - elapsed, 0);
});

const remainingTimeText = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

const sortedPlayers = computed(() => {
  return [...(room.value?.players ?? [])].sort((a, b) => {
    return (a.turnOrder ?? 999) - (b.turnOrder ?? 999);
  });
});

const topicDisplayPlayers = computed(() => {
  return sortedPlayers.value.map((player) => ({
    ...player,
    visibleTopic: player.id === myPlayerId.value ? '？？？' : player.assignedTopic ?? '未設定',
    isMine: player.id === myPlayerId.value,
  }));
});

const loadRoom = async () => {
  room.value = await getRoom(roomCode);
};

const onSubmitAction = async () => {
  errorMessage.value = '';

  if (!myPlayerId.value) {
    errorMessage.value = 'プレイヤー情報が見つかりません。入室し直してください。';
    return;
  }

  try {
    room.value = await createGameAction(roomCode, {
      playerId: myPlayerId.value,
      actionType: actionType.value,
      content: actionText.value,
    });
    actionText.value = '';
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? '行動の送信に失敗しました。';
  }
};

const onTimeout = async () => {
  if (!room.value || room.value.status !== 'playing' || isAdvancingTimeout.value) {
    return;
  }

  isAdvancingTimeout.value = true;

  try {
    room.value = await advanceTurn(roomCode, {
      playerId: currentPlayer.value?.id,
      reason: 'timeout',
    });
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'ターン更新に失敗しました。';
  } finally {
    isAdvancingTimeout.value = false;
  }
};

watch(remainingSeconds, (value) => {
  if (value === 0) {
    onTimeout();
  }
});

onMounted(async () => {
  try {
    await loadRoom();

    socket.connect();
    socket.emit('joinRoom', { roomCode });

    socket.on('gameUpdated', (updatedRoom: Room) => {
      room.value = updatedRoom;
    });

    timerId = window.setInterval(() => {
      now.value = Date.now();
    }, 1000);
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'ゲーム情報の取得に失敗しました。';
  }
});

onBeforeUnmount(() => {
  socket.off('gameUpdated');
  socket.disconnect();

  if (timerId) {
    window.clearInterval(timerId);
  }
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
        <button class="header-button" type="button" @click="router.push(`/room/${roomCode}`)">
          ルームに戻る
        </button>
      </header>

      <section class="game-layout">
        <div class="member-panel">
          <h2>お題一覧</h2>
          <p style="color: #475569; font-weight: 700;">自分のお題だけ隠されています。</p>

          <ul class="player-list">
            <li v-for="player in topicDisplayPlayers" :key="player.id" class="player-item topic-player-item">
              <span class="color-dot" :style="{ backgroundColor: player.playerColor }"></span>
              <div style="flex: 1;">
                <strong>{{ player.playerName }}</strong>
                <div class="topic-chip" :class="{ hidden: player.isMine }">
                  {{ player.visibleTopic }}
                </div>
              </div>
              <span v-if="player.id === currentPlayer?.id" class="badge">手番</span>
            </li>
          </ul>

          <div class="note-box">
            あなたが当てるお題：<strong>{{ myPlayer?.assignedTopic ? '？？？' : '未設定' }}</strong>
          </div>
        </div>

        <div class="game-panel">
          <div class="topic-card">
            <div>
              <p style="font-weight: 900;">テーマ</p>
              <h2>{{ room?.themeText ?? 'これなに？' }}</h2>
              <p v-if="room">現在ターン：{{ room.currentTurn }} / {{ room.turnLimit }}</p>
              <p v-if="currentPlayer">現在の手番：{{ currentPlayer.playerName }} さん</p>
              <p v-if="room?.status === 'finished'">ゲーム終了</p>
            </div>
          </div>

          <div v-if="room?.status === 'finished'" class="winner-box">
            <template v-if="room.winnerName">
              <h2>🎉 {{ room.winnerName }} さんの勝利！</h2>
              <p>正解：{{ room.correctTopic }}</p>
            </template>
            <template v-else>
              <h2>ゲーム終了</h2>
              <p>ターン上限に達しました。</p>
            </template>
          </div>

          <div class="turn-action-box">
            <template v-if="room?.status === 'playing'">
              <div class="action-tabs">
                <button
                  type="button"
                  :class="{ active: actionType === 'question' }"
                  @click="actionType = 'question'"
                >
                  質問する
                </button>
                <button
                  type="button"
                  :class="{ active: actionType === 'guess' }"
                  @click="actionType = 'guess'"
                >
                  解答する
                </button>
              </div>

              <div class="answer-row">
                <input
                  v-model="actionText"
                  type="text"
                  :placeholder="actionType === 'question' ? '質問を入力...' : '自分のお題だと思う答えを入力...'"
                  :disabled="!isMyTurn"
                />
                <button
                  class="primary-button"
                  type="button"
                  :disabled="!isMyTurn || !actionText.trim()"
                  @click="onSubmitAction"
                >
                  送信する
                </button>
              </div>

              <div class="hint-box">
                <template v-if="isMyTurn">
                  💡 あなたの番です。質問するか、自分のお題を解答してください。
                </template>
                <template v-else>
                  💡 {{ currentPlayer?.playerName ?? '他のプレイヤー' }}さんの番です。
                </template>
              </div>
            </template>

            <template v-else>
              <div class="hint-box">ゲームは終了しています。</div>
            </template>
          </div>

          <div class="log-panel">
            <h2>ゲームログ</h2>
            <div v-for="log in room?.gameLogs ?? []" :key="log.id" class="log-item">
              <strong>
                {{ log.actionType === 'question' ? '質問' : log.actionType === 'guess' ? '解答' : '通知' }}
                / {{ log.playerName }}
              </strong>
              <p>{{ log.content }}</p>
            </div>
          </div>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        </div>

        <div class="timer-panel">
          <h2 style="text-align: center;">残り時間</h2>
          <div class="timer-circle">{{ remainingTimeText }}</div>
          <p style="text-align: center; color: #475569;">1ターン3分</p>
        </div>
      </section>
    </div>
  </main>
</template>
