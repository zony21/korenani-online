import { AdvanceTurnDto } from './dto/advance-turn.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameActionDto } from './dto/game-action.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';
export declare class RoomsController {
    private readonly roomsService;
    private readonly roomsGateway;
    constructor(roomsService: RoomsService, roomsGateway: RoomsGateway);
    createRoom(dto: CreateRoomDto): Promise<any>;
    getRoom(roomCode: string): Promise<any>;
    joinRoom(roomCode: string, dto: JoinRoomDto): Promise<any>;
    startRoom(roomCode: string): Promise<any>;
    createAction(roomCode: string, dto: GameActionDto): Promise<any>;
    advanceTurn(roomCode: string, dto: AdvanceTurnDto): Promise<any>;
}
