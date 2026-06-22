import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdvanceTurnDto } from './dto/advance-turn.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameActionDto } from './dto/game-action.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { SubmitTopicDto } from './dto/submit-topic.dto';
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

  private shuffle<T>(values: T[]): T[] {
    return [...values].sort(() => Math.random() - 0.5);
  }

  private normalizeAnswer(value: string): string {
    return value.trim().replace(/\s+/g, '').toLowerCase();
  }

  private toSafeRoom(room: any) {
    const { passwordHash, ...safeRoom } = room;
    return safeRoom;
  }

  private async getRoomEntity(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { roomCode },
      include: {
        players: { orderBy: [{ turnOrder: 'asc' }, { joinedAt: 'asc' }] },
        gameLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!room) {
      throw new NotFoundException('ルームが見つかりません。');
    }

    return room;
  }

  private assignTopicsWithoutSelf(players: any[]) {
    const sortedPlayers = [...players].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    if (sortedPlayers.length < 2) {
      throw new BadRequestException('2人以上で開始できます。');
    }

    if (sortedPlayers.some((player) => !player.submittedTopic?.trim())) {
      throw new BadRequestException('全員がお題を提出すると開始できます。');
    }

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const shuffledTopics = this.shuffle(
        sortedPlayers.map((player) => ({
          submittedByPlayerId: player.id,
          topic: player.submittedTopic,
        })),
      );

      const isValid = shuffledTopics.every((topic, index) => {
        return topic.submittedByPlayerId !== sortedPlayers[index].id;
      });

      if (isValid) {
        return sortedPlayers.map((player, index) => ({
          playerId: player.id,
          assignedTopic: shuffledTopics[index].topic,
          turnOrder: index,
        }));
      }
    }

    throw new BadRequestException('お題の配布に失敗しました。もう一度開始してください。');
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
        currentPlayerIndex: 0,
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
        players: { orderBy: { joinedAt: 'asc' } },
        gameLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    return this.toSafeRoom(room);
  }

  async getRoom(roomCode: string) {
    const room = await this.getRoomEntity(roomCode);
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

  async submitTopic(roomCode: string, dto: SubmitTopicDto) {
    if (!dto.topic?.trim()) {
      throw new BadRequestException('お題を入力してください。');
    }

    const room = await this.getRoomEntity(roomCode);

    if (room.status !== 'waiting') {
      throw new BadRequestException('ゲーム開始後はお題を変更できません。');
    }

    const player = room.players.find((item) => item.id === Number(dto.playerId));

    if (!player) {
      throw new BadRequestException('プレイヤーが見つかりません。');
    }

    await this.prisma.roomPlayer.update({
      where: { id: player.id },
      data: {
        submittedTopic: dto.topic.trim(),
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

    const assignedPlayers = this.assignTopicsWithoutSelf(room.players);

    await Promise.all(
      assignedPlayers.map((player) =>
        this.prisma.roomPlayer.update({
          where: { id: player.playerId },
          data: {
            assignedTopic: player.assignedTopic,
            turnOrder: player.turnOrder,
          },
        }),
      ),
    );

    const firstPlayer = assignedPlayers[0];
    const firstPlayerEntity = room.players.find((player) => player.id === firstPlayer.playerId);

    await this.prisma.gameLog.create({
      data: {
        roomId: room.id,
        playerId: firstPlayer.playerId,
        playerName: 'システム',
        actionType: 'system',
        content: 'ゲームを開始しました。自分以外が提出したお題からランダムに配布されました。',
        turnNumber: 1,
      },
    });

    await this.prisma.gameLog.create({
      data: {
        roomId: room.id,
        playerId: firstPlayer.playerId,
        playerName: 'システム',
        actionType: 'system',
        content: `${firstPlayerEntity?.playerName ?? 'プレイヤー'}さんの手番です。`,
        turnNumber: 1,
      },
    });

    const updatedRoom = await this.prisma.room.update({
      where: { roomCode },
      data: {
        status: 'playing',
        currentTurn: 1,
        currentPlayerIndex: 0,
        turnStartedAt: new Date(),
        winnerPlayerId: null,
        winnerName: null,
        correctTopic: null,
      },
      include: {
        players: { orderBy: [{ turnOrder: 'asc' }, { joinedAt: 'asc' }] },
        gameLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    return this.toSafeRoom(updatedRoom);
  }

  async createAction(roomCode: string, dto: GameActionDto) {
    if (!dto.content?.trim()) {
      throw new BadRequestException('内容を入力してください。');
    }

    if (!['question', 'guess'].includes(dto.actionType)) {
      throw new BadRequestException('行動種別が不正です。');
    }

    const room = await this.getRoomEntity(roomCode);

    if (room.status !== 'playing') {
      throw new BadRequestException('ゲーム中ではありません。');
    }

    const currentPlayer = room.players[room.currentPlayerIndex];

    if (!currentPlayer) {
      throw new BadRequestException('現在の手番プレイヤーが見つかりません。');
    }

    if (Number(dto.playerId) !== currentPlayer.id) {
      throw new BadRequestException('現在あなたの番ではありません。');
    }

    await this.prisma.gameLog.create({
      data: {
        roomId: room.id,
        playerId: currentPlayer.id,
        playerName: currentPlayer.playerName,
        actionType: dto.actionType,
        content: dto.content.trim(),
        turnNumber: room.currentTurn,
      },
    });

    if (dto.actionType === 'guess') {
      const assignedTopic = currentPlayer.assignedTopic ?? '';
      const isCorrect = this.normalizeAnswer(dto.content) === this.normalizeAnswer(assignedTopic);

      if (isCorrect) {
        await this.prisma.gameLog.create({
          data: {
            roomId: room.id,
            playerId: currentPlayer.id,
            playerName: 'システム',
            actionType: 'system',
            content: `${currentPlayer.playerName}さんが正解しました。正解は「${assignedTopic}」です。`,
            turnNumber: room.currentTurn,
          },
        });

        const finishedRoom = await this.prisma.room.update({
          where: { roomCode },
          data: {
            status: 'finished',
            winnerPlayerId: currentPlayer.id,
            winnerName: currentPlayer.playerName,
            correctTopic: assignedTopic,
          },
          include: {
            players: { orderBy: [{ turnOrder: 'asc' }, { joinedAt: 'asc' }] },
            gameLogs: { orderBy: { createdAt: 'asc' } },
          },
        });

        return this.toSafeRoom(finishedRoom);
      }

      await this.prisma.gameLog.create({
        data: {
          roomId: room.id,
          playerId: currentPlayer.id,
          playerName: 'システム',
          actionType: 'system',
          content: `${currentPlayer.playerName}さんの解答は不正解でした。`,
          turnNumber: room.currentTurn,
        },
      });
    }

    return this.advanceTurn(roomCode, { playerId: dto.playerId, reason: 'action' });
  }

  async advanceTurn(roomCode: string, dto: AdvanceTurnDto) {
    const room = await this.getRoomEntity(roomCode);

    if (room.status !== 'playing') {
      return this.toSafeRoom(room);
    }

    if (room.players.length === 0) {
      throw new BadRequestException('参加者が存在しません。');
    }

    const nextPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    const nextTurn = room.currentTurn + 1;
    const isFinished = nextTurn > room.turnLimit;

    if (isFinished) {
      await this.prisma.gameLog.create({
        data: {
          roomId: room.id,
          playerId: dto.playerId ?? 0,
          playerName: 'システム',
          actionType: 'system',
          content: 'ターン上限に達したためゲームを終了しました。',
          turnNumber: room.turnLimit,
        },
      });

      const finishedRoom = await this.prisma.room.update({
        where: { roomCode },
        data: {
          status: 'finished',
          currentTurn: room.turnLimit,
        },
        include: {
          players: { orderBy: [{ turnOrder: 'asc' }, { joinedAt: 'asc' }] },
          gameLogs: { orderBy: { createdAt: 'asc' } },
        },
      });

      return this.toSafeRoom(finishedRoom);
    }

    const nextPlayer = room.players[nextPlayerIndex];

    await this.prisma.gameLog.create({
      data: {
        roomId: room.id,
        playerId: nextPlayer.id,
        playerName: 'システム',
        actionType: 'system',
        content:
          dto.reason === 'timeout'
            ? `${room.players[room.currentPlayerIndex]?.playerName ?? 'プレイヤー'}さんの時間切れです。次の手番に移ります。`
            : `${nextPlayer.playerName}さんの手番です。`,
        turnNumber: nextTurn,
      },
    });

    const updatedRoom = await this.prisma.room.update({
      where: { roomCode },
      data: {
        currentTurn: nextTurn,
        currentPlayerIndex: nextPlayerIndex,
        turnStartedAt: new Date(),
      },
      include: {
        players: { orderBy: [{ turnOrder: 'asc' }, { joinedAt: 'asc' }] },
        gameLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    return this.toSafeRoom(updatedRoom);
  }
}
