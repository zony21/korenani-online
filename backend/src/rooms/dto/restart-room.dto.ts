export class RestartRoomDto {
  playerId: number;

  restartMode: 'same_theme' | 'change_theme';

  themeText?: string;
}
