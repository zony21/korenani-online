export class GameActionDto {
  playerId: number;

  actionType: 'question' | 'guess';

  content: string;
}
