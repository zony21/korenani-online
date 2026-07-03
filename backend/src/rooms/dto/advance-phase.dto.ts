export class AdvancePhaseDto {
  playerId?: number;

  reason?: 'answer_timeout' | 'result_timeout' | 'manual';
}
