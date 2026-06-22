export interface RoomPlayer {
  id: number;
  roomId: number;
  playerName: string;
  playerColor: string;
  isHost: boolean;
  joinedAt: string;
}

export interface Room {
  id: number;
  roomCode: string;
  hasPassword: boolean;
  status: string;
  players: RoomPlayer[];
}
