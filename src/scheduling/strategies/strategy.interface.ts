import {
  SchedulingMoment,
  SchedulingContext,
  SchedulingStrategy,
} from '../../common/interfaces';

export interface ISchedulingStrategy {
  readonly name: SchedulingStrategy;
  findOptimalMoments(context: SchedulingContext): Promise<SchedulingMoment[]>;
}

export abstract class BaseSchedulingStrategy implements ISchedulingStrategy {
  abstract readonly name: SchedulingStrategy;

  abstract findOptimalMoments(
    context: SchedulingContext,
  ): Promise<SchedulingMoment[]>;

  protected findAvailableTimeSlots(context: SchedulingContext): TimeSlot[] {
    const { config, calendarEvents } = context;
    const slots: TimeSlot[] = [];

    const weekStart = new Date(context.targetWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + day);

      if (config.excludedDays.includes(currentDate.getDay())) {
        continue;
      }

      const dailySlots = this.findDailyTimeSlots(
        currentDate,
        config,
        calendarEvents,
      );
      slots.push(...dailySlots);
    }

    return slots;
  }

  private findDailyTimeSlots(
    date: Date,
    config: any,
    calendarEvents: any[],
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    const [startHour, startMinute] = config.workingHours.start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = config.workingHours.end.split(':').map(Number);

    const workStart = new Date(date);
    workStart.setHours(startHour, startMinute, 0, 0);

    const workEnd = new Date(date);
    workEnd.setHours(endHour, endMinute, 0, 0);

    const dayEvents = calendarEvents.filter((event) => {
      const eventStart = new Date(event.startTime);
      return eventStart.toDateString() === date.toDateString();
    });

    dayEvents.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    let currentTime = new Date(workStart);

    for (const event of dayEvents) {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      if (currentTime.getTime() < eventStart.getTime()) {
        const gapDuration =
          (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);

        if (
          gapDuration >=
          config.conversationDuration + config.bufferTimeBeforeMeeting
        ) {
          slots.push({
            startTime: new Date(currentTime),
            endTime: new Date(
              eventStart.getTime() - config.bufferTimeBeforeMeeting * 60 * 1000,
            ),
            duration: gapDuration - config.bufferTimeBeforeMeeting,
          });
        }
      }

      currentTime = new Date(
        eventEnd.getTime() + config.minGapBetweenMeetings * 60 * 1000,
      );
    }
    if (currentTime.getTime() < workEnd.getTime()) {
      const gapDuration =
        (workEnd.getTime() - currentTime.getTime()) / (1000 * 60);

      if (gapDuration >= config.conversationDuration) {
        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(workEnd),
          duration: gapDuration,
        });
      }
    }

    return slots;
  }

  protected calculateConfidence(
    slot: TimeSlot,
    context: SchedulingContext,
    strategyFactors: any = {},
  ): number {
    let confidence = 0.5; // Base confidence

    const hour = slot.startTime.getHours();
    if (hour >= 10 && hour <= 11) {
      confidence += 0.3;
    } else if (hour >= 14 && hour <= 15) {
      confidence += 0.2;
    } else if (hour >= 9 && hour <= 16) {
      confidence += 0.1;
    }

    const durationBonus = Math.min(0.2, slot.duration / 120);
    confidence += durationBonus;

    const dayOfWeek = slot.startTime.getDay();
    if (dayOfWeek >= 2 && dayOfWeek <= 4) {
      confidence += 0.1;
    }

    Object.keys(strategyFactors).forEach((factor) => {
      confidence += strategyFactors[factor];
    });

    return Math.min(1, Math.max(0, confidence));
  }
}

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
}
