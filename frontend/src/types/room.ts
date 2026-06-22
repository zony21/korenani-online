export interface RoomPlayer {
  id: number;
  roomId: number;
  playerName: string;
  playerColor: string;
  isHost: boolean;
  turnOrder?: number | null;
  assignedTopic?: string | null;
  joinedAt: string;
}

export interface Room {
  id: number;
  roomCode: string;
  topicMode: string;
  themeText: string;
  turnLimit: number;
  currentTurn: number;
  hasPassword: boolean;
  status: string;
  players: RoomPlayer[];
}
