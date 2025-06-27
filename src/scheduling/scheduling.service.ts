import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledConversation } from './entities/scheduled-conversation.entity';
import { StrategyFactory } from './strategies/strategy.factory';
import { CalendarService } from '../calendar/calendar.service';
import { ConfigurationService } from '../config/configuration.service';
import { UsersService } from '../users/users.service';
import {
  SchedulingMoment,
  SchedulingContext,
  SchedulingStrategy,
} from '../common/interfaces';
import {
  FindOptimalMomentsDto,
  FindOptimalMomentsResponseDto,
} from './dto/scheduling.dto';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(ScheduledConversation)
    private readonly scheduledConversationRepository: Repository<ScheduledConversation>,
    private readonly strategyFactory: StrategyFactory,
    private readonly calendarService: CalendarService,
    private readonly configurationService: ConfigurationService,
    private readonly usersService: UsersService,
  ) {}

  async findOptimalMoments(
    dto: FindOptimalMomentsDto,
  ): Promise<FindOptimalMomentsResponseDto> {
    const user = await this.usersService.findById(dto.userId);
    if (!user) {
      throw new NotFoundException(`User with id ${dto.userId} not found`);
    }

    const weekStart = dto.weekStart
      ? new Date(dto.weekStart)
      : this.getStartOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const context = await this.buildSchedulingContext(dto.userId, weekStart);

    const strategy = this.strategyFactory.getStrategy(dto.strategy);
    const moments = await strategy.findOptimalMoments(context);

    const existingThisWeek = context.existingConversations.length;
    const remainingCapacity =
      context.config.maxConversationsPerWeek - existingThisWeek;

    return {
      userId: dto.userId,
      strategy: dto.strategy,
      moments,
      weekRange: {
        start: weekStart,
        end: weekEnd,
      },
      metadata: {
        totalSlotsAnalyzed: context.calendarEvents.length,
        existingConversationsThisWeek: existingThisWeek,
        remainingCapacity: Math.max(0, remainingCapacity),
        userConfig: context.config,
      },
    };
  }

  async scheduleConversation(
    userId: string,
    moment: {
      scheduledTime: Date;
      confidence: number;
      reason: string;
      strategy: string;
    },
  ): Promise<ScheduledConversation> {
    await this.usersService.findById(userId);

    const conversation = this.scheduledConversationRepository.create({
      userId,
      scheduledTime: moment.scheduledTime,
      confidence: moment.confidence,
      reason: moment.reason,
      strategy: moment.strategy as SchedulingStrategy,
    });

    return this.scheduledConversationRepository.save(conversation);
  }

  async getScheduledConversations(
    userId: string,
  ): Promise<ScheduledConversation[]> {
    return this.scheduledConversationRepository.find({
      where: { userId, isCancelled: false },
      order: { scheduledTime: 'ASC' },
    });
  }

  async compareStrategies(
    userId: string,
    weekStart?: Date,
  ): Promise<{ strategy: string; moments: SchedulingMoment[] }[]> {
    await this.usersService.findById(userId);
    const targetWeekStart = weekStart || this.getStartOfWeek(new Date());
    const context = await this.buildSchedulingContext(userId, targetWeekStart);

    const results = [];
    const strategies = this.strategyFactory.getAllStrategies();

    for (const strategy of strategies) {
      const moments = await strategy.findOptimalMoments(context);
      results.push({
        strategy: strategy.name,
        moments,
      });
    }

    return results;
  }

  private async buildSchedulingContext(
    userId: string,
    weekStart: Date,
  ): Promise<SchedulingContext> {
    await this.usersService.findById(userId);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const config = await this.configurationService.getSchedulingConfig(userId);

    const calendarEvents = this.calendarService.getEventsForUser(
      userId,
      weekStart,
      weekEnd,
    );

    const existingConversations =
      await this.scheduledConversationRepository.find({
        where: {
          userId,
          scheduledTime: {
            gte: weekStart,
            lte: weekEnd,
          } as any,
          isCancelled: false,
        },
      });

    return {
      userId,
      config,
      calendarEvents,
      existingConversations: existingConversations.map((conv) => ({
        id: conv.id,
        userId: conv.userId,
        scheduledTime: conv.scheduledTime,
        confidence: conv.confidence,
        reason: conv.reason,
        strategy: conv.strategy,
        createdAt: conv.createdAt,
      })),
      targetWeekStart: weekStart,
    };
  }

  private getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }
}
