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
    <div v-if="questions.length === 0" class="history-empty">まだ質問はありません。</div>
    <div v-for="question in questions" :key="question.id" class="question-history-item">
      <strong>ターン{{ question.turnNumber }} / {{ question.playerName }}</strong>
      <p>{{ question.questionText }}</p>
      <div class="answer-chip-row">
        <span v-for="answer in question.answers" :key="answer.id" :class="['answer-chip', answer.answerKbn]">
          {{ answer.playerName }}：{{ answerLabel(answer.answerKbn) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-history-panel {
  margin-top: 18px;
  padding: 18px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #dbeafe;
}

.question-history-panel h2 {
  margin-top: 0;
}

.history-empty {
  padding: 14px;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 14px;
  font-weight: 800;
}

.question-history-item {
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-top: 10px;
}

.question-history-item strong {
  color: #2563eb;
}

.question-history-item p {
  margin: 8px 0;
  color: #334155;
  font-weight: 800;
}

.answer-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.answer-chip {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-weight: 800;
  font-size: 13px;
}

.answer-chip.yes {
  background: #dcfce7;
  color: #047857;
}

.answer-chip.no {
  background: #fee2e2;
  color: #b91c1c;
}

.answer-chip.unknown {
  background: #fef3c7;
  color: #b45309;
}
</style>
