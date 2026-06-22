export interface RoomPlayer {
  id: number;
  roomId: number;
  playerName: string;
  playerColor: string;
  isHost: boolean;
  turnOrder?: number | null;
  submittedTopic?: string | null;
  assignedTopic?: string | null;
  joinedAt: string;
}

export interface GameLog {
  id: number;
  roomId: number;
  playerId: number;
  playerName: string;
  actionType: 'question' | 'guess' | 'system';
  content: string;
  turnNumber: number;
  createdAt: string;
}

export interface Room {
  id: number;
  roomCode: string;
  topicMode: string;
  themeText: string;
  turnLimit: number;
  currentTurn: number;
  currentPlayerIndex: number;
  turnStartedAt?: string | null;
  hasPassword: boolean;
  status: string;
  winnerPlayerId?: number | null;
  winnerName?: string | null;
  correctTopic?: string | null;
  players: RoomPlayer[];
  gameLogs: GameLog[];
}
