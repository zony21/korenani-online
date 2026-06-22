export class AdvanceTurnDto {
  playerId?: number;

  reason?: 'action' | 'timeout' | 'manual';
}
