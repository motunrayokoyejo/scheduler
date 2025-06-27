export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  location?: string;
  isAllDay?: boolean;
}

export interface SchedulingMoment {
  scheduledTime: Date;
  confidence: number; // 0-1 score
  reason: string;
  strategy: string;
}

export interface SchedulingConfig {
  workingHours: {
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  excludedDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  maxConversationsPerWeek: number;
  minGapBetweenMeetings: number; // minutes
  conversationDuration: number; // minutes
  bufferTimeBeforeMeeting: number; // minutes
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
}

export interface SchedulingContext {
  userId: string;
  config: SchedulingConfig;
  calendarEvents: CalendarEvent[];
  existingConversations: ScheduledConversation[];
  targetWeekStart: Date;
}

export interface ScheduledConversation {
  id: string;
  userId: string;
  scheduledTime: Date;
  confidence: number;
  reason: string;
  strategy: string;
  createdAt: Date;
}

export enum SchedulingStrategy {
  AGGRESSIVE = 'aggressive',
  CONSERVATIVE = 'conservative',
}

export interface ISchedulingStrategy {
  readonly name: SchedulingStrategy;
  findOptimalMoments(context: SchedulingContext): Promise<SchedulingMoment[]>;
}

export interface ICalendarService {
  getEventsForUser(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): CalendarEvent[];
}

export interface IConfigurationService {
  getSchedulingConfig(userId: string): Promise<SchedulingConfig>;
  getSystemDefaults(): SchedulingConfig;
}
