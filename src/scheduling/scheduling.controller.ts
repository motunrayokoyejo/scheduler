import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import {
  FindOptimalMomentsDto,
  FindOptimalMomentsResponseDto,
  ScheduleConversationDto,
} from './dto/scheduling.dto';
import { SchedulingStrategy } from '../common/interfaces';

@Controller('api/scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('find-moments')
  async findOptimalMoments(
    @Body() dto: FindOptimalMomentsDto,
  ): Promise<FindOptimalMomentsResponseDto> {
    return this.schedulingService.findOptimalMoments(dto);
  }

  @Post('schedule')
  async scheduleConversation(@Body() dto: ScheduleConversationDto) {
    const momentData = {
      scheduledTime: new Date(dto.scheduledTime),
      confidence: dto.confidence,
      reason: dto.reason,
      strategy: dto.strategy,
    };
    return this.schedulingService.scheduleConversation(dto.userId, momentData);
  }

  @Get('conversations/:userId')
  async getScheduledConversations(@Param('userId') userId: string) {
    return this.schedulingService.getScheduledConversations(userId);
  }

  @Get('compare-strategies/:userId')
  async compareStrategies(
    @Param('userId') userId: string,
    @Query('weekStart') weekStart?: string,
  ) {
    const targetWeekStart = weekStart ? new Date(weekStart) : undefined;
    return this.schedulingService.compareStrategies(userId, targetWeekStart);
  }

  @Get('strategies')
  async getAvailableStrategies() {
    return {
      strategies: Object.values(SchedulingStrategy).map((strategy) => ({
        name: strategy,
        description: this.getStrategyDescription(strategy),
      })),
    };
  }

  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'scheduling',
    };
  }

  private getStrategyDescription(strategy: SchedulingStrategy): string {
    switch (strategy) {
      case SchedulingStrategy.AGGRESSIVE:
        return 'Prioritizes immediate scheduling, finds any available slot with minimal requirements';
      case SchedulingStrategy.CONSERVATIVE:
        return 'Optimizes for quality interactions, seeks optimal time periods with generous buffers';
      default:
        return 'Unknown strategy';
    }
  }
}
