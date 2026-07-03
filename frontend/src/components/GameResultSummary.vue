<script setup lang="ts">
import { computed } from 'vue';
import type { GameLog, GameQuestion } from '../types/room';

const props = defineProps<{
  currentTurn: number;
  questions: GameQuestion[];
  gameLogs: GameLog[];
}>();

const answerCount = computed(() => {
  return props.questions.reduce((total, question) => total + question.answers.length, 0);
});

const guessCount = computed(() => {
  return props.gameLogs.filter((log) => log.actionType === 'guess').length;
});
</script>

<template>
  <div class="result-summary-grid">
    <div><strong>{{ currentTurn }}</strong><span>到達ターン</span></div>
    <div><strong>{{ questions.length }}</strong><span>質問数</span></div>
    <div><strong>{{ answerCount }}</strong><span>回答数</span></div>
    <div><strong>{{ guessCount }}</strong><span>解答数</span></div>
  </div>
</template>

<style scoped>
.result-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 18px;
}

.result-summary-grid div {
  padding: 14px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #dbeafe;
}

.result-summary-grid strong {
  display: block;
  font-size: 26px;
  color: #2563eb;
}

.result-summary-grid span {
  display: block;
  margin-top: 4px;
  color: #475569;
  font-weight: 800;
}

@media (max-width: 900px) {
  .result-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
