import { PrismaService } from '../prisma/prisma.service';
import { AdvanceTurnDto } from './dto/advance-turn.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameActionDto } from './dto/game-action.dto';
import { JoinRoomDto } from './dto/join-room.dto';
export declare class RoomsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private createRoomCode;
    private validatePassword;
    private shuffle;
    private toSafeRoom;
    private getRoomEntity;
    createRoom(dto: CreateRoomDto): Promise<any>;
    getRoom(roomCode: string): Promise<any>;
    joinRoom(roomCode: string, dto: JoinRoomDto): Promise<any>;
    startRoom(roomCode: string): Promise<any>;
    createAction(roomCode: string, dto: GameActionDto): Promise<any>;
    advanceTurn(roomCode: string, dto: AdvanceTurnDto): Promise<any>;
}
