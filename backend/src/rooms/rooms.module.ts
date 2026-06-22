import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomsController } from './rooms.controller';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';

@Module({
  imports: [PrismaModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway],
})
export class RoomsModule {}
