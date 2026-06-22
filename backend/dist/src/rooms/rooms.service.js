"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
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
let RoomsService = class RoomsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    createRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    validatePassword(password) {
        if (!password || !/^[a-zA-Z0-9]{5}$/.test(password)) {
            throw new common_1.BadRequestException('パスワードは5桁の英数字で入力してください。');
        }
    }
    shuffle(values) {
        return [...values].sort(() => Math.random() - 0.5);
    }
    toSafeRoom(room) {
        const { passwordHash, ...safeRoom } = room;
        return safeRoom;
    }
    async getRoomEntity(roomCode) {
        const room = await this.prisma.room.findUnique({
            where: { roomCode },
            include: {
                players: { orderBy: [{ turnOrder: 'asc' }, { joinedAt: 'asc' }] },
                gameLogs: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!room) {
            throw new common_1.NotFoundException('ルームが見つかりません。');
        }
        return room;
    }
    async createRoom(dto) {
        if (!dto.hostName?.trim()) {
            throw new common_1.BadRequestException('作成者名を入力してください。');
        }
        if (!dto.themeText?.trim()) {
            throw new common_1.BadRequestException('テーマを入力してください。');
        }
        if (![10, 20, 30].includes(Number(dto.turnLimit))) {
            throw new common_1.BadRequestException('ターン上限は10、20、30から選択してください。');
        }
        let passwordHash = null;
        if (dto.hasPassword) {
            this.validatePassword(dto.password);
            passwordHash = await bcrypt.hash(dto.password, 10);
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
    async getRoom(roomCode) {
        const room = await this.getRoomEntity(roomCode);
        return this.toSafeRoom(room);
    }
    async joinRoom(roomCode, dto) {
        if (!dto.playerName?.trim()) {
            throw new common_1.BadRequestException('名前を入力してください。');
        }
        const room = await this.prisma.room.findUnique({
            where: { roomCode },
            include: { players: { orderBy: { joinedAt: 'asc' } } },
        });
        if (!room) {
            throw new common_1.NotFoundException('ルームが見つかりません。');
        }
        if (room.status !== 'waiting') {
            throw new common_1.BadRequestException('ゲーム開始後は入室できません。');
        }
        if (room.players.length >= 9) {
            throw new common_1.BadRequestException('参加人数の上限に達しています。');
        }
        if (room.hasPassword) {
            if (!dto.password) {
                throw new common_1.BadRequestException('パスワードを入力してください。');
            }
            const isMatch = await bcrypt.compare(dto.password, room.passwordHash ?? '');
            if (!isMatch) {
                throw new common_1.BadRequestException('パスワードが違います。');
            }
        }
        const usedColors = room.players.map((player) => player.playerColor);
        const playerColor = PLAYER_COLORS.find((color) => !usedColors.includes(color));
        if (!playerColor) {
            throw new common_1.BadRequestException('使用できる色がありません。');
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
    async startRoom(roomCode) {
        const room = await this.prisma.room.findUnique({
            where: { roomCode },
            include: { players: { orderBy: { joinedAt: 'asc' } } },
        });
        if (!room) {
            throw new common_1.NotFoundException('ルームが見つかりません。');
        }
        if (room.players.length < 2) {
            throw new common_1.BadRequestException('2人以上で開始できます。');
        }
        if (room.status !== 'waiting') {
            throw new common_1.BadRequestException('このルームは開始できません。');
        }
        const shuffledPlayers = this.shuffle(room.players);
        await Promise.all(shuffledPlayers.map((player, index) => this.prisma.roomPlayer.update({
            where: { id: player.id },
            data: { turnOrder: index },
        })));
        await this.prisma.gameLog.create({
            data: {
                roomId: room.id,
                playerId: shuffledPlayers[0].id,
                playerName: 'システム',
                actionType: 'system',
                content: 'ゲームを開始しました。ターン順がランダムに決定されました。',
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
            },
            include: {
                players: { orderBy: [{ turnOrder: 'asc' }, { joinedAt: 'asc' }] },
                gameLogs: { orderBy: { createdAt: 'asc' } },
            },
        });
        return this.toSafeRoom(updatedRoom);
    }
    async createAction(roomCode, dto) {
        if (!dto.content?.trim()) {
            throw new common_1.BadRequestException('内容を入力してください。');
        }
        if (!['question', 'guess'].includes(dto.actionType)) {
            throw new common_1.BadRequestException('行動種別が不正です。');
        }
        const room = await this.getRoomEntity(roomCode);
        if (room.status !== 'playing') {
            throw new common_1.BadRequestException('ゲーム中ではありません。');
        }
        const currentPlayer = room.players[room.currentPlayerIndex];
        if (!currentPlayer) {
            throw new common_1.BadRequestException('現在の手番プレイヤーが見つかりません。');
        }
        if (Number(dto.playerId) !== currentPlayer.id) {
            throw new common_1.BadRequestException('現在あなたの番ではありません。');
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
        return this.advanceTurn(roomCode, { playerId: dto.playerId, reason: 'action' });
    }
    async advanceTurn(roomCode, dto) {
        const room = await this.getRoomEntity(roomCode);
        if (room.status !== 'playing') {
            return this.toSafeRoom(room);
        }
        if (room.players.length === 0) {
            throw new common_1.BadRequestException('参加者が存在しません。');
        }
        const nextPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
        const nextTurn = room.currentTurn + 1;
        const isFinished = nextTurn > room.turnLimit;
        if (isFinished) {
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
            return this.getRoom(roomCode);
        }
        const nextPlayer = room.players[nextPlayerIndex];
        await this.prisma.gameLog.create({
            data: {
                roomId: room.id,
                playerId: nextPlayer.id,
                playerName: 'システム',
                actionType: 'system',
                content: dto.reason === 'timeout'
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
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map