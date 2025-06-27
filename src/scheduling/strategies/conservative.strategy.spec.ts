import { Test, TestingModule } from '@nestjs/testing';
import { ConservativeStrategy } from './conservative.strategy';
import { SchedulingContext, SchedulingStrategy } from '../../common/interfaces';

describe('ConservativeStrategy', () => {
  let strategy: ConservativeStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConservativeStrategy],
    }).compile();

    strategy = module.get<ConservativeStrategy>(ConservativeStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
    expect(strategy.name).toBe(SchedulingStrategy.CONSERVATIVE);
  });

  describe('findOptimalMoments', () => {
    it('should find high-quality moments prioritizing optimal conditions', async () => {
      const mockContext: SchedulingContext = {
        userId: 'b68-4f1b-8c2d-3',
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
            startTime: new Date('2025-07-01T08:00:00Z'),
            endTime: new Date('2025-07-01T09:00:00Z'),
          },
          {
            id: 'event-2',
            title: 'Afternoon Meeting',
            startTime: new Date('2025-07-02T17:00:00Z'),
            endTime: new Date('2025-07-02T18:00:00Z'),
          },
        ],
        existingConversations: [],
        targetWeekStart: new Date('2025-06-30T00:00:00Z'),
      };

      const moments = await strategy.findOptimalMoments(mockContext);
      expect(moments).toBeDefined();
      expect(moments[0]?.strategy).toBe(SchedulingStrategy.CONSERVATIVE);

      if (moments.length > 1) {
        expect(moments[0].confidence).toBeGreaterThanOrEqual(
          moments[1].confidence,
        );
      }
      moments.forEach((moment) => {
        const hour = moment.scheduledTime.getHours();
        const dayOfWeek = moment.scheduledTime.getDay();
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThanOrEqual(16);
        expect([2, 3, 4]).toContain(dayOfWeek);
        expect(moment.reason).toContain('quality');
      });
    });

    it('should respect max conversations per week limit', async () => {
      const mockContext: SchedulingContext = {
        userId: 'b68-4f1b-8c2d-3',
        config: {
          workingHours: { start: '09:00', end: '17:00' },
          excludedDays: [0, 6],
          maxConversationsPerWeek: 2,
          minGapBetweenMeetings: 15,
          conversationDuration: 30,
          bufferTimeBeforeMeeting: 5,
        },
        calendarEvents: [],
        existingConversations: [
          {
            id: 'existing-1',
            userId: 'e66c5f2e-0b68-4f1b-8c2d-3e5f6a7b8c9d',
            scheduledTime: new Date('2025-07-01T14:00:00Z'),
            confidence: 0.8,
            reason: 'Test',
            strategy: 'conservative',
            createdAt: new Date(),
          },
          {
            id: 'existing-2',
            userId: '4f1b-8c2d-3e5f6a7b8c9d',
            scheduledTime: new Date('2025-07-02T15:00:00Z'),
            confidence: 0.7,
            reason: 'Test',
            strategy: 'conservative',
            createdAt: new Date(),
          },
        ],
        targetWeekStart: new Date('2025-06-30T00:00:00Z'),
      };

      const moments = await strategy.findOptimalMoments(mockContext);
      expect(moments).toEqual([]);
    });

    it('should distribute moments across the week', async () => {
      const mockContext: SchedulingContext = {
        userId: 'e66c5f2e-0b68-4f1b-8c2d-3e5f6a7b8c9d',
        config: {
          workingHours: { start: '09:00', end: '17:00' },
          excludedDays: [0, 1, 5, 6],
          maxConversationsPerWeek: 3,
          minGapBetweenMeetings: 60,
          conversationDuration: 30,
          bufferTimeBeforeMeeting: 5,
        },
        calendarEvents: [],
        existingConversations: [],
        targetWeekStart: new Date('2025-06-30T00:00:00Z'), // Monday
      };

      const moments = await strategy.findOptimalMoments(mockContext);

      expect(moments.length).toBeGreaterThan(0);

      const momentsByDay = new Map<string, number>();
      moments.forEach((moment) => {
        const day = moment.scheduledTime.toDateString();
        momentsByDay.set(day, (momentsByDay.get(day) || 0) + 1);
      });

      Array.from(momentsByDay.values()).forEach((count) => {
        expect(count).toBeLessThanOrEqual(1);
      });
    });

    it('should prioritize prime time slots', async () => {
      const mockContext: SchedulingContext = {
        userId: 'test-user-id',
        config: {
          workingHours: { start: '09:00', end: '17:00' },
          excludedDays: [0, 6],
          maxConversationsPerWeek: 2,
          minGapBetweenMeetings: 15,
          conversationDuration: 30,
          bufferTimeBeforeMeeting: 5,
        },
        calendarEvents: [],
        existingConversations: [],
        targetWeekStart: new Date('2025-06-30T00:00:00Z'),
      };

      const moments = await strategy.findOptimalMoments(mockContext);
      expect(moments.length).toBeGreaterThan(0);

      const primeTimeMoments = moments.filter((moment) => {
        const hour = moment.scheduledTime.getHours();
        return (hour >= 10 && hour <= 11) || (hour >= 14 && hour <= 15);
      });

      if (primeTimeMoments.length > 0) {
        const primeTimeConfidence = primeTimeMoments[0].confidence;
        const nonPrimeTimeMoments = moments.filter(
          (moment) => !primeTimeMoments.includes(moment),
        );

        if (nonPrimeTimeMoments.length > 0) {
          expect(primeTimeConfidence).toBeGreaterThanOrEqual(
            nonPrimeTimeMoments[0].confidence,
          );
        }
        primeTimeMoments.forEach((moment) => {
          expect(moment.reason).toContain('Prime conversation time');
        });
      }
    });

    it('should require generous buffer time for slots', async () => {
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
            id: 'short-gap',
            title: 'Meeting Before',
            startTime: new Date('2025-07-02T10:00:00Z'),
            endTime: new Date('2025-07-02T10:45:00Z'),
          },
          {
            id: 'next-meeting',
            title: 'Meeting After',
            startTime: new Date('2025-07-02T11:30:00Z'),
            endTime: new Date('2025-07-02T12:00:00Z'),
          },
        ],
        existingConversations: [],
        targetWeekStart: new Date('2025-06-30T00:00:00Z'),
      };

      const moments = await strategy.findOptimalMoments(mockContext);
      moments.forEach((moment) => {
        expect(moment.scheduledTime.getTime()).not.toBe(
          new Date('2025-07-02T10:45:00Z').getTime(),
        );
      });
    });
  });

  describe('isPrimeTime', () => {
    it('should identify prime time slots correctly', () => {
      const createTime = (hour: number, minute: number = 0) => {
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        return date;
      };

      expect(strategy['isPrimeTime'](createTime(10, 0))).toBe(true); // 10:00 AM
      expect(strategy['isPrimeTime'](createTime(10, 30))).toBe(true); // 10:30 AM
      expect(strategy['isPrimeTime'](createTime(11, 0))).toBe(true); // 11:00 AM
      expect(strategy['isPrimeTime'](createTime(15, 0))).toBe(true); // 3:00 PM
      expect(strategy['isPrimeTime'](createTime(15, 30))).toBe(true); // 3:30 PM

      expect(strategy['isPrimeTime'](createTime(9, 30))).toBe(false); // 9:30 AM
      expect(strategy['isPrimeTime'](createTime(12, 0))).toBe(false); // 12:00 PM
      expect(strategy['isPrimeTime'](createTime(16, 0))).toBe(false); // 4:00 PM
      expect(strategy['isPrimeTime'](createTime(16, 30))).toBe(false); // 4:30 PM
    });
  });
});
