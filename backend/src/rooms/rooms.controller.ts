import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AdvanceTurnDto } from './dto/advance-turn.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameActionDto } from './dto/game-action.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { SubmitTopicDto } from './dto/submit-topic.dto';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly roomsGateway: RoomsGateway,
  ) {}

  @Post()
  async createRoom(@Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(dto);
  }

  @Get(':roomCode')
  async getRoom(@Param('roomCode') roomCode: string) {
    return this.roomsService.getRoom(roomCode);
  }

  @Post(':roomCode/join')
  async joinRoom(@Param('roomCode') roomCode: string, @Body() dto: JoinRoomDto) {
    const room = await this.roomsService.joinRoom(roomCode, dto);
    this.roomsGateway.notifyPlayersUpdated(roomCode, room.players);
    this.roomsGateway.notifyGameUpdated(roomCode, room);
    return room;
  }

  @Post(':roomCode/topic')
  async submitTopic(@Param('roomCode') roomCode: string, @Body() dto: SubmitTopicDto) {
    const room = await this.roomsService.submitTopic(roomCode, dto);
    this.roomsGateway.notifyGameUpdated(roomCode, room);
    return room;
  }

  @Post(':roomCode/start')
  async startRoom(@Param('roomCode') roomCode: string) {
    const room = await this.roomsService.startRoom(roomCode);
    this.roomsGateway.notifyGameUpdated(roomCode, room);
    this.roomsGateway.notifyRoomStarted(roomCode, room);
    return room;
  }

  @Post(':roomCode/action')
  async createAction(@Param('roomCode') roomCode: string, @Body() dto: GameActionDto) {
    const room = await this.roomsService.createAction(roomCode, dto);
    this.roomsGateway.notifyGameUpdated(roomCode, room);
    return room;
  }

  @Post(':roomCode/advance-turn')
  async advanceTurn(@Param('roomCode') roomCode: string, @Body() dto: AdvanceTurnDto) {
    const room = await this.roomsService.advanceTurn(roomCode, dto);
    this.roomsGateway.notifyGameUpdated(roomCode, room);
    return room;
  }
}
