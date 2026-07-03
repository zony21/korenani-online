<script setup lang="ts">
import type { GameQuestion } from '../types/room';

defineProps<{ questions: GameQuestion[] }>();

const answerLabel = (answerKbn: string) => {
  if (answerKbn === 'yes') return 'はい';
  if (answerKbn === 'no') return 'いいえ';
  return 'どちらともいえない';
};
</script>

<template>
  <div class="question-history-panel">
    <h2>質問履歴</h2>
    <div v-if="questions.length === 0" class="hint-box">まだ質問はありません。</div>
    <div v-for="question in questions" :key="question.id" class="question-history-item">
      <strong>ターン{{ question.turnNumber }} / {{ question.playerName }}</strong>
      <p>{{ question.questionText }}</p>
      <span v-for="answer in question.answers" :key="answer.id">
        {{ answer.playerName }}：{{ answerLabel(answer.answerKbn) }}
      </span>
    </div>
  </div>
</template>
