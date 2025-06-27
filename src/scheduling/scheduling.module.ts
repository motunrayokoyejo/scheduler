import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledConversation } from './entities/scheduled-conversation.entity';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { StrategyFactory } from './strategies/strategy.factory';
import { AggressiveStrategy } from './strategies/aggressive.strategy';
import { ConservativeStrategy } from './strategies/conservative.strategy';
import { CalendarModule } from '../calendar/calendar.module';
import { ConfigurationModule } from '../config/configuration.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledConversation]),
    CalendarModule,
    ConfigurationModule,
    UsersModule,
  ],
  controllers: [SchedulingController],
  providers: [
    SchedulingService,
    StrategyFactory,
    AggressiveStrategy,
    ConservativeStrategy,
  ],
  exports: [SchedulingService],
})
export class SchedulingModule {}
