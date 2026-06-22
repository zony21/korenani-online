import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import * as bcrypt from 'bcrypt';

const PLAYER_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#22C55E',
  '#EAB308',
  '#A855F7',
  '#06B6D4',
  '#F97316',
  '#EC4899',
  '#92400E',
];

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private createRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private validatePassword(password?: string): void {
    if (!password || !/^[a-zA-Z0-9]{5}$/.test(password)) {
      throw new BadRequestException('パスワードは5桁の英数字で入力してください。');
    }
  }

  async createRoom(dto: CreateRoomDto) {
    if (!dto.hostName?.trim()) {
      throw new BadRequestException('作成者名を入力してください。');
    }

    let passwordHash: string | null = null;

    if (dto.hasPassword) {
      this.validatePassword(dto.password);
      passwordHash = await bcrypt.hash(dto.password!, 10);
    }

    return this.prisma.room.create({
      data: {
        roomCode: this.createRoomCode(),
        hasPassword: dto.hasPassword,
        passwordHash,
        players: {
          create: {
            playerName: dto.hostName.trim(),
            playerColor: PLAYER_COLORS[0],
            isHost: true,
          },
        },
      },
      include: {
        players: true,
      },
    });
  }

  async getRoom(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { roomCode },
      include: { players: { orderBy: { joinedAt: 'asc' } } },
    });

    if (!room) {
      throw new NotFoundException('ルームが見つかりません。');
    }

    return room;
  }

  async joinRoom(roomCode: string, dto: JoinRoomDto) {
    if (!dto.playerName?.trim()) {
      throw new BadRequestException('名前を入力してください。');
    }

    const room = await this.getRoom(roomCode);

    if (room.players.length >= 9) {
      throw new BadRequestException('参加人数の上限に達しています。');
    }

    if (room.hasPassword) {
      if (!dto.password) {
        throw new BadRequestException('パスワードを入力してください。');
      }

      const isMatch = await bcrypt.compare(dto.password, room.passwordHash ?? '');

      if (!isMatch) {
        throw new BadRequestException('パスワードが違います。');
      }
    }

    const usedColors = room.players.map((player) => player.playerColor);
    const playerColor = PLAYER_COLORS.find((color) => !usedColors.includes(color));

    if (!playerColor) {
      throw new BadRequestException('使用できる色がありません。');
    }

    await this.prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        playerName: dto.playerName.trim(),
        playerColor,
        isHost: false,
      },
    });

    return this.getRoom(roomCode);
  }
}
