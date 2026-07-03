<script setup lang="ts">
import type { GameLog, GameQuestion } from '../types/room';

const props = defineProps<{
  currentTurn: number;
  questions: GameQuestion[];
  gameLogs: GameLog[];
}>();

const answerCount = props.questions.reduce((total, question) => total + question.answers.length, 0);
const guessCount = props.gameLogs.filter((log) => log.actionType === 'guess').length;
</script>

<template>
  <div class="result-summary-grid">
    <div><strong>{{ currentTurn }}</strong><span>到達ターン</span></div>
    <div><strong>{{ questions.length }}</strong><span>質問数</span></div>
    <div><strong>{{ answerCount }}</strong><span>回答数</span></div>
    <div><strong>{{ guessCount }}</strong><span>解答数</span></div>
  </div>
</template>
