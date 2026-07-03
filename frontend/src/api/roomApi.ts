import axios from 'axios';
import type { Room } from '../types/room';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});

export interface CreateRoomRequest {
  hostName: string;
  hasPassword: boolean;
  password?: string;
  topicMode: string;
  themeText: string;
  turnLimit: number;
}

export interface JoinRoomRequest {
  playerName: string;
  password?: string;
}

export interface SubmitTopicRequest {
  playerId: number;
  topic: string;
}

export interface GameActionRequest {
  playerId: number;
  actionType: 'question' | 'guess';
  content: string;
}

export interface QuestionAnswerRequest {
  playerId: number;
  answerKbn: 'yes' | 'no' | 'unknown';
}

export interface AdvancePhaseRequest {
  playerId?: number;
  reason?: 'answer_timeout' | 'result_timeout' | 'manual';
}

export interface AdvanceTurnRequest {
  playerId?: number;
  reason?: 'action' | 'timeout' | 'manual';
}

export const createRoom = async (request: CreateRoomRequest): Promise<Room> => {
  const response = await api.post<Room>('/rooms', request);
  return response.data;
};

export const joinRoom = async (roomCode: string, request: JoinRoomRequest): Promise<Room> => {
  const response = await api.post<Room>(`/rooms/${roomCode}/join`, request);
  return response.data;
};

export const getRoom = async (roomCode: string): Promise<Room> => {
  const response = await api.get<Room>(`/rooms/${roomCode}`);
  return response.data;
};

export const submitTopic = async (
  roomCode: string,
  request: SubmitTopicRequest,
): Promise<Room> => {
  const response = await api.post<Room>(`/rooms/${roomCode}/topic`, request);
  return response.data;
};

export const startRoom = async (roomCode: string): Promise<Room> => {
  const response = await api.post<Room>(`/rooms/${roomCode}/start`);
  return response.data;
};

export const createGameAction = async (
  roomCode: string,
  request: GameActionRequest,
): Promise<Room> => {
  const response = await api.post<Room>(`/rooms/${roomCode}/action`, request);
  return response.data;
};

export const answerQuestion = async (
  roomCode: string,
  questionId: number,
  request: QuestionAnswerRequest,
): Promise<Room> => {
  const response = await api.post<Room>(`/rooms/${roomCode}/question/${questionId}/answer`, request);
  return response.data;
};

export const advancePhase = async (
  roomCode: string,
  request: AdvancePhaseRequest,
): Promise<Room> => {
  const response = await api.post<Room>(`/rooms/${roomCode}/advance-phase`, request);
  return response.data;
};

export const advanceTurn = async (
  roomCode: string,
  request: AdvanceTurnRequest,
): Promise<Room> => {
  const response = await api.post<Room>(`/rooms/${roomCode}/advance-turn`, request);
  return response.data;
};
