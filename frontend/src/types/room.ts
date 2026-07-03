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
  actionType: string;
  content: string;
  turnNumber: number;
  createdAt: string;
}

export interface GameQuestionAnswer {
  id: number;
  questionId: number;
  playerId: number;
  playerName: string;
  answerKbn: string;
  createdAt: string;
}

export interface GameQuestion {
  id: number;
  roomId: number;
  playerId: number;
  playerName: string;
  questionText: string;
  turnNumber: number;
  status: string;
  startedAt: string;
  answerDeadlineAt: string;
  resultDeadlineAt?: string | null;
  answers: GameQuestionAnswer[];
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
  phase?: string;
  phaseStartedAt?: string | null;
  phaseEndsAt?: string | null;
  activeQuestionId?: number | null;
  hasPassword: boolean;
  status: string;
  winnerPlayerId?: number | null;
  winnerName?: string | null;
  correctTopic?: string | null;
  players: RoomPlayer[];
  gameLogs: GameLog[];
  questions?: GameQuestion[];
}
