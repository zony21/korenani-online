import { Server, Socket } from 'socket.io';
export declare class RoomsGateway {
    server: Server;
    handleJoinRoom(data: {
        roomCode: string;
    }, client: Socket): void;
    notifyPlayersUpdated(roomCode: string, players: unknown[]): void;
    notifyRoomStarted(roomCode: string, room: unknown): void;
    notifyGameUpdated(roomCode: string, room: unknown): void;
}
