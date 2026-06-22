import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
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
    return room;
  }
}
