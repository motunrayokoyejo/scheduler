import { Test, TestingModule } from '@nestjs/testing';
import { AggressiveStrategy } from './aggressive.strategy';
import { SchedulingContext, SchedulingStrategy } from '../../common/interfaces';

describe('AggressiveStrategy', () => {
  let strategy: AggressiveStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AggressiveStrategy],
    }).compile();

    strategy = module.get<AggressiveStrategy>(AggressiveStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
    expect(strategy.name).toBe(SchedulingStrategy.AGGRESSIVE);
  });

  describe('findOptimalMoments', () => {
    it('should find moments prioritizing earliest available times', async () => {
      const mockContext: SchedulingContext = {
        userId: 'test-user-id',
        config: {
          workingHours: { start: '09:00', end: '17:00' },
          excludedDays: [0, 6],
          maxConversationsPerWeek: 3,
          minGapBetweenMeetings: 15,
          conversationDuration: 30,
          bufferTimeBeforeMeeting: 5,
        },
        calendarEvents: [
          {
            id: 'event-1',
            title: 'Morning Meeting',
            startTime: new Date('2025-07-01T10:00:00Z'),
            endTime: new Date('2025-07-01T11:00:00Z'),
          },
        ],
        existingConversations: [],
        targetWeekStart: new Date('2025-06-30T00:00:00Z'),
      };
      const moments = await strategy.findOptimalMoments(mockContext);
      expect(moments).toBeDefined();
      expect(moments.length).toBeGreaterThan(0);
      expect(moments[0].strategy).toBe(SchedulingStrategy.AGGRESSIVE);
      expect(moments[0].confidence).toBeGreaterThan(0);
      expect(moments[0].reason).toContain('scheduling');

      if (moments.length > 1) {
        expect(moments[0].scheduledTime.getTime()).toBeLessThanOrEqual(
          moments[1].scheduledTime.getTime(),
        );
      }
    });

    it('should respect max conversations per week limit', async () => {
      const mockContext: SchedulingContext = {
        userId: 'test-user-id',
        config: {
          workingHours: { start: '09:00', end: '17:00' },
          excludedDays: [],
          maxConversationsPerWeek: 2,
          minGapBetweenMeetings: 15,
          conversationDuration: 30,
          bufferTimeBeforeMeeting: 5,
        },
        calendarEvents: [],
        existingConversations: [
          {
            id: 'existing-1',
            userId: 'test-user-id',
            scheduledTime: new Date('2025-07-01T14:00:00Z'),
            confidence: 0.8,
            reason: 'Test',
            strategy: 'aggressive',
            createdAt: new Date(),
          },
          {
            id: 'existing-2',
            userId: 'test-user-id',
            scheduledTime: new Date('2025-07-02T15:00:00Z'),
            confidence: 0.7,
            reason: 'Test',
            strategy: 'aggressive',
            createdAt: new Date(),
          },
        ],
        targetWeekStart: new Date('2025-06-30T00:00:00Z'),
      };

      const moments = await strategy.findOptimalMoments(mockContext);
      expect(moments).toEqual([]);
    });

    it('should handle empty calendar gracefully', async () => {
      const mockContext: SchedulingContext = {
        userId: 'test-user-id',
        config: {
          workingHours: { start: '09:00', end: '17:00' },
          excludedDays: [0, 6],
          maxConversationsPerWeek: 3,
          minGapBetweenMeetings: 15,
          conversationDuration: 30,
          bufferTimeBeforeMeeting: 5,
        },
        calendarEvents: [],
        existingConversations: [],
        targetWeekStart: new Date('2025-06-30T00:00:00Z'),
      };
      const moments = await strategy.findOptimalMoments(mockContext);
      expect(moments).toBeDefined();
      expect(moments.length).toBeGreaterThan(0);
      expect(moments.length).toBeLessThanOrEqual(
        mockContext.config.maxConversationsPerWeek,
      );
    });
  });
});
