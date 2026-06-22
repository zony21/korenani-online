"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsController = void 0;
const common_1 = require("@nestjs/common");
const advance_turn_dto_1 = require("./dto/advance-turn.dto");
const create_room_dto_1 = require("./dto/create-room.dto");
const game_action_dto_1 = require("./dto/game-action.dto");
const join_room_dto_1 = require("./dto/join-room.dto");
const rooms_gateway_1 = require("./rooms.gateway");
const rooms_service_1 = require("./rooms.service");
let RoomsController = class RoomsController {
    constructor(roomsService, roomsGateway) {
        this.roomsService = roomsService;
        this.roomsGateway = roomsGateway;
    }
    async createRoom(dto) {
        return this.roomsService.createRoom(dto);
    }
    async getRoom(roomCode) {
        return this.roomsService.getRoom(roomCode);
    }
    async joinRoom(roomCode, dto) {
        const room = await this.roomsService.joinRoom(roomCode, dto);
        this.roomsGateway.notifyPlayersUpdated(roomCode, room.players);
        return room;
    }
    async startRoom(roomCode) {
        const room = await this.roomsService.startRoom(roomCode);
        this.roomsGateway.notifyGameUpdated(roomCode, room);
        this.roomsGateway.notifyRoomStarted(roomCode, room);
        return room;
    }
    async createAction(roomCode, dto) {
        const room = await this.roomsService.createAction(roomCode, dto);
        this.roomsGateway.notifyGameUpdated(roomCode, room);
        return room;
    }
    async advanceTurn(roomCode, dto) {
        const room = await this.roomsService.advanceTurn(roomCode, dto);
        this.roomsGateway.notifyGameUpdated(roomCode, room);
        return room;
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_room_dto_1.CreateRoomDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "createRoom", null);
__decorate([
    (0, common_1.Get)(':roomCode'),
    __param(0, (0, common_1.Param)('roomCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "getRoom", null);
__decorate([
    (0, common_1.Post)(':roomCode/join'),
    __param(0, (0, common_1.Param)('roomCode')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, join_room_dto_1.JoinRoomDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "joinRoom", null);
__decorate([
    (0, common_1.Post)(':roomCode/start'),
    __param(0, (0, common_1.Param)('roomCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "startRoom", null);
__decorate([
    (0, common_1.Post)(':roomCode/action'),
    __param(0, (0, common_1.Param)('roomCode')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, game_action_dto_1.GameActionDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "createAction", null);
__decorate([
    (0, common_1.Post)(':roomCode/advance-turn'),
    __param(0, (0, common_1.Param)('roomCode')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, advance_turn_dto_1.AdvanceTurnDto]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "advanceTurn", null);
exports.RoomsController = RoomsController = __decorate([
    (0, common_1.Controller)('rooms'),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService,
        rooms_gateway_1.RoomsGateway])
], RoomsController);
//# sourceMappingURL=rooms.controller.js.map