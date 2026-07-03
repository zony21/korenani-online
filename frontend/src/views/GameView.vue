<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { advancePhase, advanceTurn, answerQuestion, createGameAction, getRoom } from '../api/roomApi';
import { socket } from '../socket/socket';
import type { GameQuestion, Room } from '../types/room';

const DEFAULT_SECONDS = 180;

const route = useRoute();
const router = useRouter();
const roomCode = String(route.params.roomCode);

const room = ref<Room | null>(null);
const errorMessage = ref('');
const actionType = ref<'question' | 'guess'>('question');
const actionText = ref('');
const now = ref(Date.now());
const isAutoAdvancing = ref(false);

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

const activeQuestion = computed<GameQuestion | null>(() => {
  if (!room.value?.activeQuestionId) {
    return null;
  }
  return room.value.questions?.find((question) => question.id === room.value?.activeQuestionId) ?? null;
});

const isMyTurn = computed(() => {
  return currentPlayer.value?.id === myPlayerId.value && (room.value?.phase ?? 'action') === 'action';
});

const amIQuestioner = computed(() => {
  return activeQuestion.value?.playerId === myPlayerId.value;
});

const myAnswer = computed(() => {
  return activeQuestion.value?.answers.find((answer) => answer.playerId === myPlayerId.value) ?? null;
});

const answerTargetPlayers = computed(() => {
  if (!activeQuestion.value || !room.value) {
    return [];
  }
  return room.value.players.filter((player) => player.id !== activeQuestion.value?.playerId);
});

const remainingSeconds = computed(() => {
  if (!room.value?.phaseEndsAt || room.value.status !== 'playing') {
    return DEFAULT_SECONDS;
  }
  const endsAt = new Date(room.value.phaseEndsAt).getTime();
  const remaining = Math.ceil((endsAt - now.value) / 1000);
  return Math.max(remaining, 0);
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

const phaseLabel = computed(() => {
  switch (room.value?.phase ?? 'action') {
    case 'action':
      return '質問または解答を選択';
    case 'answering':
      return '他プレイヤー回答待ち';
    case 'result':
      return '回答結果確認';
    case 'finished':
      return 'ゲーム終了';
    default:
      return '待機中';
  }
});

const answerLabel = (answerKbn: string) => {
  if (answerKbn === 'yes') {
    return 'はい';
  }
  if (answerKbn === 'no') {
    return 'いいえ';
  }
  return 'どちらともいえない';
};

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

const onSubmitAnswer = async (answerKbn: 'yes' | 'no' | 'unknown') => {
  errorMessage.value = '';

  if (!myPlayerId.value) {
    errorMessage.value = 'プレイヤー情報が見つかりません。入室し直してください。';
    return;
  }

  if (!activeQuestion.value) {
    errorMessage.value = '回答対象の質問が見つかりません。';
    return;
  }

  try {
    room.value = await answerQuestion(roomCode, activeQuestion.value.id, {
      playerId: myPlayerId.value,
      answerKbn,
    });
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? '回答に失敗しました。';
  }
};

const onPhaseTimeout = async () => {
  if (!room.value || room.value.status !== 'playing' || isAutoAdvancing.value) {
    return;
  }

  isAutoAdvancing.value = true;

  try {
    if ((room.value.phase ?? 'action') === 'action') {
      room.value = await advanceTurn(roomCode, {
        playerId: currentPlayer.value?.id,
        reason: 'timeout',
      });
    } else if (room.value.phase === 'answering') {
      room.value = await advancePhase(roomCode, {
        playerId: currentPlayer.value?.id,
        reason: 'answer_timeout',
      });
    } else if (room.value.phase === 'result') {
      room.value = await advancePhase(roomCode, {
        playerId: currentPlayer.value?.id,
        reason: 'result_timeout',
      });
    }
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message ?? 'フェーズ更新に失敗しました。';
  } finally {
    isAutoAdvancing.value = false;
  }
};

watch(remainingSeconds, (value) => {
  if (value === 0) {
    onPhaseTimeout();
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

          <div v-if="room?.phase === 'answering' && activeQuestion" class="answer-status-box">
            <h3>回答状況</h3>
            <div v-for="player in answerTargetPlayers" :key="player.id" class="answer-status-row">
              <span>{{ player.playerName }}</span>
              <strong>
                {{ activeQuestion.answers.some((answer) => answer.playerId === player.id) ? '回答済' : '未回答' }}
              </strong>
            </div>
          </div>
        </div>

        <div class="game-panel">
          <div class="topic-card">
            <div>
              <p style="font-weight: 900;">テーマ</p>
              <h2>{{ room?.themeText ?? 'これなに？' }}</h2>
              <p v-if="room">現在ターン：{{ room.currentTurn }} / {{ room.turnLimit }}</p>
              <p v-if="currentPlayer">現在の手番：{{ currentPlayer.playerName }} さん</p>
              <p>状態：{{ phaseLabel }}</p>
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

          <div v-if="(room?.phase ?? 'action') === 'action' && room?.status === 'playing'" class="turn-action-box">
            <div class="action-tabs">
              <button type="button" :class="{ active: actionType === 'question' }" @click="actionType = 'question'">
                質問する
              </button>
              <button type="button" :class="{ active: actionType === 'guess' }" @click="actionType = 'guess'">
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
              <button class="primary-button" type="button" :disabled="!isMyTurn || !actionText.trim()" @click="onSubmitAction">
                送信する
              </button>
            </div>

            <div class="hint-box">
              <template v-if="isMyTurn">💡 あなたの番です。質問するか、自分のお題を解答してください。</template>
              <template v-else>💡 {{ currentPlayer?.playerName ?? '他のプレイヤー' }}さんの番です。</template>
            </div>
          </div>

          <div v-if="room?.phase === 'answering' && activeQuestion" class="question-phase-box">
            <h2>質問</h2>
            <p class="question-text">{{ activeQuestion.questionText }}</p>
            <p>質問者：{{ activeQuestion.playerName }}</p>

            <template v-if="amIQuestioner">
              <div class="hint-box">他プレイヤーの回答を待っています。</div>
            </template>
            <template v-else-if="myAnswer">
              <div class="hint-box">あなたの回答：{{ answerLabel(myAnswer.answerKbn) }}</div>
            </template>
            <template v-else>
              <div class="answer-choice-grid">
                <button class="answer-choice yes" type="button" @click="onSubmitAnswer('yes')">はい</button>
                <button class="answer-choice no" type="button" @click="onSubmitAnswer('no')">いいえ</button>
                <button class="answer-choice unknown" type="button" @click="onSubmitAnswer('unknown')">どちらともいえない</button>
              </div>
            </template>
          </div>

          <div v-if="room?.phase === 'result' && activeQuestion" class="question-result-box">
            <h2>回答結果</h2>
            <p class="question-text">{{ activeQuestion.questionText }}</p>
            <div v-for="answer in activeQuestion.answers" :key="answer.id" class="result-answer-row">
              <span>{{ answer.playerName }}</span>
              <strong :class="answer.answerKbn">{{ answerLabel(answer.answerKbn) }}</strong>
            </div>
            <div class="hint-box">1分後に次のプレイヤーへ移ります。</div>
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
          <p style="text-align: center; color: #475569;">{{ phaseLabel }}</p>
        </div>
      </section>
    </div>
  </main>
</template>
