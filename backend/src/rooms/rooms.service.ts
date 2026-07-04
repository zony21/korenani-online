import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdvancePhaseDto } from './dto/advance-phase.dto';
import { AdvanceTurnDto } from './dto/advance-turn.dto';
import { CloseRoomDto } from './dto/close-room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { GameActionDto } from './dto/game-action.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { QuestionAnswerDto } from './dto/question-answer.dto';
import { RestartRoomDto } from './dto/restart-room.dto';
import { SubmitTopicDto } from './dto/submit-topic.dto';
import * as bcrypt from 'bcrypt';

const PLAYER_COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#EAB308', '#A855F7', '#06B6D4', '#F97316', '#EC4899', '#92400E'];
const ACTION_SECONDS = 180;
const ANSWER_SECONDS = 180;
const RESULT_SECONDS = 60;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private createRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private addSeconds(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }

  private shuffle<T>(values: T[]): T[] {
    return [...values].sort(() => Math.random() - 0.5);
  }

  private normalizeAnswer(value: string): string {
    return value.trim().replace(/\s+/g, '').toLowerCase();
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

  private roomInclude() {
    return {
      players: { orderBy: [{ turnOrder: 'asc' as const }, { joinedAt: 'asc' as const }] },
      gameLogs: { orderBy: { createdAt: 'asc' as const } },
      questions: {
        orderBy: { startedAt: 'asc' as const },
        include: { answers: { orderBy: { createdAt: 'asc' as const } } },
      },
    };
  }

  private getTurnPlayers(players: any[]) {
    return [...players].sort((a, b) => {
      const orderA = a.turnOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.turnOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });
  }

  private getCurrentTurnPlayer(room: any) {
    const turnPlayers = this.getTurnPlayers(room.players);
    return turnPlayers.find((player) => player.turnOrder === room.currentPlayerIndex) ?? turnPlayers[room.currentPlayerIndex] ?? null;
  }

  private async getRoomEntity(roomCode: string) {
    const room = await this.prisma.room.findUnique({ where: { roomCode }, include: this.roomInclude() });
    if (!room) {
      throw new NotFoundException('ルームが見つかりません。');
    }
    return room;
  }

  private assertHost(room: any, playerId: number) {
    const player = room.players.find((item: any) => item.id === Number(playerId));
    if (!player || !player.isHost) {
      throw new BadRequestException('この操作はホストのみ実行できます。');
    }
  }

  private getActiveQuestion(room: any) {
    if (!room.activeQuestionId) {
      return null;
    }
    return room.questions.find((question: any) => question.id === room.activeQuestionId) ?? null;
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
      const shuffledTopics = this.shuffle(sortedPlayers.map((player) => ({ submittedByPlayerId: player.id, topic: player.submittedTopic })));
      const isValid = shuffledTopics.every((topic, index) => topic.submittedByPlayerId !== sortedPlayers[index].id);
      if (isValid) {
        return sortedPlayers.map((player, index) => ({ playerId: player.id, assignedTopic: shuffledTopics[index].topic, turnOrder: index }));
      }
    }
    throw new BadRequestException('お題の配布に失敗しました。もう一度開始してください。');
  }

  async createRoom(dto: CreateRoomDto) {
    if (!dto.hostName?.trim()) throw new BadRequestException('作成者名を入力してください。');
    if (!dto.themeText?.trim()) throw new BadRequestException('テーマを入力してください。');
    if (![10, 20, 30].includes(Number(dto.turnLimit))) throw new BadRequestException('ターン上限は10、20、30から選択してください。');

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
        phase: 'waiting',
        hasPassword: dto.hasPassword,
        passwordHash,
        status: 'waiting',
        players: { create: { playerName: dto.hostName.trim(), playerColor: PLAYER_COLORS[0], isHost: true } },
      },
      include: this.roomInclude(),
    });
    return this.toSafeRoom(room);
  }

  async getRoom(roomCode: string) {
    return this.toSafeRoom(await this.getRoomEntity(roomCode));
  }

  async joinRoom(roomCode: string, dto: JoinRoomDto) {
    if (!dto.playerName?.trim()) throw new BadRequestException('名前を入力してください。');
    const room = await this.prisma.room.findUnique({ where: { roomCode }, include: { players: { orderBy: { joinedAt: 'asc' } } } });
    if (!room) throw new NotFoundException('ルームが見つかりません。');
    if (room.status !== 'waiting') throw new BadRequestException('ゲーム開始後は入室できません。');
    if (room.players.length >= 9) throw new BadRequestException('参加人数の上限に達しています。');
    if (room.hasPassword) {
      if (!dto.password) throw new BadRequestException('パスワードを入力してください。');
      const isMatch = await bcrypt.compare(dto.password, room.passwordHash ?? '');
      if (!isMatch) throw new BadRequestException('パスワードが違います。');
    }
    const usedColors = room.players.map((player) => player.playerColor);
    const playerColor = PLAYER_COLORS.find((color) => !usedColors.includes(color));
    if (!playerColor) throw new BadRequestException('使用できる色がありません。');
    await this.prisma.roomPlayer.create({ data: { roomId: room.id, playerName: dto.playerName.trim(), playerColor, isHost: false } });
    return this.getRoom(roomCode);
  }

  async submitTopic(roomCode: string, dto: SubmitTopicDto) {
    if (!dto.topic?.trim()) throw new BadRequestException('お題を入力してください。');
    const room = await this.getRoomEntity(roomCode);
    if (room.status !== 'waiting') throw new BadRequestException('ゲーム開始後はお題を変更できません。');
    const player = room.players.find((item: any) => item.id === Number(dto.playerId));
    if (!player) throw new BadRequestException('プレイヤーが見つかりません。');
    await this.prisma.roomPlayer.update({ where: { id: player.id }, data: { submittedTopic: dto.topic.trim() } });
    return this.getRoom(roomCode);
  }

  async startRoom(roomCode: string) {
    const room = await this.prisma.room.findUnique({ where: { roomCode }, include: { players: { orderBy: { joinedAt: 'asc' } } } });
    if (!room) throw new NotFoundException('ルームが見つかりません。');
    if (room.players.length < 2) throw new BadRequestException('2人以上で開始できます。');
    if (room.status !== 'waiting') throw new BadRequestException('このルームは開始できません。');

    const assignedPlayers = this.assignTopicsWithoutSelf(room.players);
    await Promise.all(assignedPlayers.map((player) => this.prisma.roomPlayer.update({ where: { id: player.playerId }, data: { assignedTopic: player.assignedTopic, turnOrder: player.turnOrder } })));
    const firstPlayer = assignedPlayers[0];
    const firstPlayerEntity = room.players.find((player) => player.id === firstPlayer.playerId);
    const now = new Date();

    await this.prisma.gameLog.create({ data: { roomId: room.id, playerId: firstPlayer.playerId, playerName: 'システム', actionType: 'system', content: 'ゲームを開始しました。自分以外が提出したお題からランダムに配布されました。', turnNumber: 1 } });
    await this.prisma.gameLog.create({ data: { roomId: room.id, playerId: firstPlayer.playerId, playerName: 'システム', actionType: 'system', content: `${firstPlayerEntity?.playerName ?? 'プレイヤー'}さんの手番です。`, turnNumber: 1 } });

    const updatedRoom = await this.prisma.room.update({
      where: { roomCode },
      data: { status: 'playing', phase: 'action', currentTurn: 1, currentPlayerIndex: 0, turnStartedAt: now, phaseStartedAt: now, phaseEndsAt: this.addSeconds(ACTION_SECONDS), activeQuestionId: null, winnerPlayerId: null, winnerName: null, correctTopic: null },
      include: this.roomInclude(),
    });
    return this.toSafeRoom(updatedRoom);
  }

  async createAction(roomCode: string, dto: GameActionDto) {
    if (!dto.content?.trim()) throw new BadRequestException('内容を入力してください。');
    if (!['question', 'guess'].includes(dto.actionType)) throw new BadRequestException('行動種別が不正です。');
    const room = await this.getRoomEntity(roomCode);
    if (room.status !== 'playing') throw new BadRequestException('ゲーム中ではありません。');
    if (room.phase !== 'action') throw new BadRequestException('現在は質問または解答を選択するタイミングではありません。');
    const currentPlayer = this.getCurrentTurnPlayer(room);
    if (!currentPlayer) throw new BadRequestException('現在の手番プレイヤーが見つかりません。');
    if (Number(dto.playerId) !== currentPlayer.id) throw new BadRequestException('現在あなたの番ではありません。');

    await this.prisma.gameLog.create({ data: { roomId: room.id, playerId: currentPlayer.id, playerName: currentPlayer.playerName, actionType: dto.actionType, content: dto.content.trim(), turnNumber: room.currentTurn } });

    if (dto.actionType === 'question') {
      const answerDeadlineAt = this.addSeconds(ANSWER_SECONDS);
      const question = await this.prisma.gameQuestion.create({ data: { roomId: room.id, playerId: currentPlayer.id, playerName: currentPlayer.playerName, questionText: dto.content.trim(), turnNumber: room.currentTurn, status: 'answering', answerDeadlineAt } });
      const updatedRoom = await this.prisma.room.update({ where: { roomCode }, data: { phase: 'answering', phaseStartedAt: new Date(), phaseEndsAt: answerDeadlineAt, activeQuestionId: question.id }, include: this.roomInclude() });
      return this.toSafeRoom(updatedRoom);
    }

    const assignedTopic = currentPlayer.assignedTopic ?? '';
    const isCorrect = this.normalizeAnswer(dto.content) === this.normalizeAnswer(assignedTopic);
    if (isCorrect) {
      await this.prisma.gameLog.create({ data: { roomId: room.id, playerId: currentPlayer.id, playerName: 'システム', actionType: 'system', content: `${currentPlayer.playerName}さんが正解しました。正解は「${assignedTopic}」です。`, turnNumber: room.currentTurn } });
      const finishedRoom = await this.prisma.room.update({ where: { roomCode }, data: { status: 'finished', phase: 'finished', winnerPlayerId: currentPlayer.id, winnerName: currentPlayer.playerName, correctTopic: assignedTopic, phaseEndsAt: null }, include: this.roomInclude() });
      return this.toSafeRoom(finishedRoom);
    }

    await this.prisma.gameLog.create({ data: { roomId: room.id, playerId: currentPlayer.id, playerName: 'システム', actionType: 'system', content: `${currentPlayer.playerName}さんの解答は不正解でした。`, turnNumber: room.currentTurn } });
    return this.advanceTurn(roomCode, { playerId: dto.playerId, reason: 'action' });
  }

  async answerQuestion(roomCode: string, questionId: number, dto: QuestionAnswerDto) {
    if (!['yes', 'no', 'unknown'].includes(dto.answerKbn)) throw new BadRequestException('回答が不正です。');
    const room = await this.getRoomEntity(roomCode);
    if (room.status !== 'playing' || room.phase !== 'answering') throw new BadRequestException('現在は回答受付中ではありません。');
    const activeQuestion = this.getActiveQuestion(room);
    if (!activeQuestion || activeQuestion.id !== questionId) throw new BadRequestException('現在の質問が見つかりません。');
    const answerPlayer = room.players.find((player: any) => player.id === Number(dto.playerId));
    if (!answerPlayer) throw new BadRequestException('プレイヤーが見つかりません。');
    if (answerPlayer.id === activeQuestion.playerId) throw new BadRequestException('質問者は回答できません。');

    await this.prisma.gameQuestionAnswer.upsert({
      where: { questionId_playerId: { questionId: activeQuestion.id, playerId: answerPlayer.id } },
      update: { answerKbn: dto.answerKbn, playerName: answerPlayer.playerName },
      create: { questionId: activeQuestion.id, playerId: answerPlayer.id, playerName: answerPlayer.playerName, answerKbn: dto.answerKbn },
    });

    const latestRoom = await this.getRoomEntity(roomCode);
    const latestQuestion = this.getActiveQuestion(latestRoom);
    if (!latestQuestion) return this.toSafeRoom(latestRoom);
    const targetPlayerIds = latestRoom.players.filter((player: any) => player.id !== latestQuestion.playerId).map((player: any) => player.id);
    const answeredPlayerIds = latestQuestion.answers.map((answer: any) => answer.playerId);
    const allAnswered = targetPlayerIds.every((playerId: number) => answeredPlayerIds.includes(playerId));
    if (allAnswered) return this.revealQuestionResult(roomCode, latestQuestion.id, 'all_answered');
    return this.getRoom(roomCode);
  }

  private async revealQuestionResult(roomCode: string, questionId: number, reason: 'all_answered' | 'timeout') {
    const room = await this.getRoomEntity(roomCode);
    const question = room.questions.find((item: any) => item.id === questionId);
    if (!question || question.status !== 'answering') return this.toSafeRoom(room);
    const resultDeadlineAt = this.addSeconds(RESULT_SECONDS);
    await this.prisma.gameQuestion.update({ where: { id: question.id }, data: { status: 'result', resultDeadlineAt } });
    await this.prisma.gameLog.create({ data: { roomId: room.id, playerId: question.playerId, playerName: 'システム', actionType: 'system', content: reason === 'timeout' ? '回答時間が終了しました。回答結果を表示します。' : '全員の回答が出そろいました。回答結果を表示します。', turnNumber: room.currentTurn } });
    const updatedRoom = await this.prisma.room.update({ where: { roomCode }, data: { phase: 'result', phaseStartedAt: new Date(), phaseEndsAt: resultDeadlineAt }, include: this.roomInclude() });
    return this.toSafeRoom(updatedRoom);
  }

  async advancePhase(roomCode: string, dto: AdvancePhaseDto) {
    const room = await this.getRoomEntity(roomCode);
    if (room.status !== 'playing') return this.toSafeRoom(room);
    const activeQuestion = this.getActiveQuestion(room);
    if (room.phase === 'answering' && activeQuestion) return this.revealQuestionResult(roomCode, activeQuestion.id, 'timeout');
    if (room.phase === 'result') {
      if (activeQuestion) await this.prisma.gameQuestion.update({ where: { id: activeQuestion.id }, data: { status: 'closed' } });
      return this.advanceTurn(roomCode, { playerId: dto.playerId, reason: 'action' });
    }
    return this.toSafeRoom(room);
  }

  async advanceTurn(roomCode: string, dto: AdvanceTurnDto) {
    const room = await this.getRoomEntity(roomCode);
    if (room.status !== 'playing') return this.toSafeRoom(room);
    const turnPlayers = this.getTurnPlayers(room.players);
    if (turnPlayers.length === 0) throw new BadRequestException('参加者が存在しません。');
    const currentPlayer = this.getCurrentTurnPlayer(room);
    const currentOrder = currentPlayer?.turnOrder ?? room.currentPlayerIndex;
    const nextPlayerIndex = (currentOrder + 1) % turnPlayers.length;
    const nextTurn = room.currentTurn + 1;
    if (nextTurn > room.turnLimit) {
      await this.prisma.gameLog.create({ data: { roomId: room.id, playerId: dto.playerId ?? 0, playerName: 'システム', actionType: 'system', content: 'ターン上限に達したためゲームを終了しました。', turnNumber: room.turnLimit } });
      const finishedRoom = await this.prisma.room.update({ where: { roomCode }, data: { status: 'finished', phase: 'finished', currentTurn: room.turnLimit, phaseEndsAt: null, activeQuestionId: null }, include: this.roomInclude() });
      return this.toSafeRoom(finishedRoom);
    }
    const nextPlayer = turnPlayers.find((player) => player.turnOrder === nextPlayerIndex) ?? turnPlayers[nextPlayerIndex];
    await this.prisma.gameLog.create({ data: { roomId: room.id, playerId: nextPlayer.id, playerName: 'システム', actionType: 'system', content: dto.reason === 'timeout' ? `${currentPlayer?.playerName ?? 'プレイヤー'}さんの時間切れです。次の手番に移ります。` : `${nextPlayer.playerName}さんの手番です。`, turnNumber: nextTurn } });
    const now = new Date();
    const updatedRoom = await this.prisma.room.update({ where: { roomCode }, data: { phase: 'action', currentTurn: nextTurn, currentPlayerIndex: nextPlayerIndex, turnStartedAt: now, phaseStartedAt: now, phaseEndsAt: this.addSeconds(ACTION_SECONDS), activeQuestionId: null }, include: this.roomInclude() });
    return this.toSafeRoom(updatedRoom);
  }

  async restartRoom(roomCode: string, dto: RestartRoomDto) {
    const room = await this.getRoomEntity(roomCode);
    this.assertHost(room, dto.playerId);
    if (!['finished', 'closed'].includes(room.status)) {
      throw new BadRequestException('ゲーム終了後のみ次のゲームを開始できます。');
    }
    if (dto.restartMode === 'change_theme' && !dto.themeText?.trim()) {
      throw new BadRequestException('新しいテーマを入力してください。');
    }

    await this.prisma.gameQuestionAnswer.deleteMany({ where: { question: { roomId: room.id } } });
    await this.prisma.gameQuestion.deleteMany({ where: { roomId: room.id } });
    await this.prisma.gameLog.deleteMany({ where: { roomId: room.id } });
    await this.prisma.roomPlayer.updateMany({ where: { roomId: room.id }, data: { submittedTopic: null, assignedTopic: null, turnOrder: null } });

    const updatedRoom = await this.prisma.room.update({
      where: { roomCode },
      data: {
        themeText: dto.restartMode === 'change_theme' ? dto.themeText!.trim() : room.themeText,
        status: 'waiting',
        phase: 'waiting',
        currentTurn: 0,
        currentPlayerIndex: 0,
        turnStartedAt: null,
        phaseStartedAt: null,
        phaseEndsAt: null,
        activeQuestionId: null,
        winnerPlayerId: null,
        winnerName: null,
        correctTopic: null,
      },
      include: this.roomInclude(),
    });
    return this.toSafeRoom(updatedRoom);
  }

  async closeRoom(roomCode: string, dto: CloseRoomDto) {
    const room = await this.getRoomEntity(roomCode);
    this.assertHost(room, dto.playerId);
    const updatedRoom = await this.prisma.room.update({
      where: { roomCode },
      data: { status: 'closed', phase: 'closed', phaseEndsAt: null },
      include: this.roomInclude(),
    });
    return this.toSafeRoom(updatedRoom);
  }
}
