import axios from 'axios';
import type { Room } from '../types/room';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});

export interface CreateRoomRequest {
  hostName: string;
  hasPassword: boolean;
  password?: string;
}

export interface JoinRoomRequest {
  playerName: string;
  password?: string;
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
