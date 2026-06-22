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

  private toSafeRoom(room: any) {
    const { passwordHash, ...safeRoom } = room;
    return safeRoom;
  }

  async createRoom(dto: CreateRoomDto) {
    if (!dto.hostName?.trim()) {
      throw new BadRequestException('作成者名を入力してください。');
    }

    if (!dto.themeText?.trim()) {
      throw new BadRequestException('テーマを入力してください。');
    }

    if (![10, 20, 30].includes(Number(dto.turnLimit))) {
      throw new BadRequestException('ターン上限は10、20、30から選択してください。');
    }

    let passwordHash: string | null = null;

    if (dto.hasPassword) {
      this.validatePassword(dto.password);
      passwordHash = await bcrypt.hash(dto.password!, 10);
    }

    const room = await this.prisma.room.create({
      data: {
        roomCode: this.createRoomCode(),
        topicMode: dto.topicMode || 'free',
        themeText: dto.themeText.trim(),
        turnLimit: Number(dto.turnLimit),
        currentTurn: 0,
        hasPassword: dto.hasPassword,
        passwordHash,
        status: 'waiting',
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

    return this.toSafeRoom(room);
  }

  async getRoom(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { roomCode },
      include: { players: { orderBy: { joinedAt: 'asc' } } },
    });

    if (!room) {
      throw new NotFoundException('ルームが見つかりません。');
    }

    return this.toSafeRoom(room);
  }

  async joinRoom(roomCode: string, dto: JoinRoomDto) {
    if (!dto.playerName?.trim()) {
      throw new BadRequestException('名前を入力してください。');
    }

    const room = await this.prisma.room.findUnique({
      where: { roomCode },
      include: { players: { orderBy: { joinedAt: 'asc' } } },
    });

    if (!room) {
      throw new NotFoundException('ルームが見つかりません。');
    }

    if (room.status !== 'waiting') {
      throw new BadRequestException('ゲーム開始後は入室できません。');
    }

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

  async startRoom(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { roomCode },
      include: { players: { orderBy: { joinedAt: 'asc' } } },
    });

    if (!room) {
      throw new NotFoundException('ルームが見つかりません。');
    }

    if (room.players.length < 2) {
      throw new BadRequestException('2人以上で開始できます。');
    }

    if (room.status !== 'waiting') {
      throw new BadRequestException('このルームは開始できません。');
    }

    const updatedRoom = await this.prisma.room.update({
      where: { roomCode },
      data: {
        status: 'playing',
        currentTurn: 0,
      },
      include: {
        players: { orderBy: { joinedAt: 'asc' } },
      },
    });

    return this.toSafeRoom(updatedRoom);
  }
}
