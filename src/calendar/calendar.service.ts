import { Injectable } from '@nestjs/common';
import { CalendarEvent, ICalendarService } from '../common/interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CalendarService implements ICalendarService {
  private readonly meetingTypes = [
    { title: 'Team Standup', duration: 30, frequency: 'daily' },
    { title: 'Product Review', duration: 60, frequency: 'weekly' },
    { title: 'Client Meeting', duration: 45, frequency: 'occasional' },
    { title: 'Design Review', duration: 90, frequency: 'weekly' },
    { title: '1:1 with Manager', duration: 30, frequency: 'weekly' },
    { title: 'Sprint Planning', duration: 120, frequency: 'biweekly' },
    { title: 'Code Review Session', duration: 60, frequency: 'occasional' },
    { title: 'Training Session', duration: 60, frequency: 'monthly' },
  ];

  getEventsForUser(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const userSeed = this.hashUserId(userId);

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend || userSeed % 4 === 0) {
        const dailyEvents = this.generateDailyEvents(
          userId,
          currentDate,
          userSeed,
        );
        events.push(...dailyEvents);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  private generateDailyEvents(
    userId: string,
    date: Date,
    userSeed: number,
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const dayOfWeek = date.getDay();

    const meetingCount = Math.max(1, (userSeed + dayOfWeek) % 5);

    const workingHours = {
      start: 9, // 9 AM
      end: 17, // 5 PM
    };

    const usedTimeSlots: Array<{ start: number; end: number }> = [];

    for (let i = 0; i < meetingCount; i++) {
      const meetingType =
        this.meetingTypes[
          (userSeed + i + dayOfWeek) % this.meetingTypes.length
        ];

      const startHour = this.findAvailableTimeSlot(
        workingHours,
        usedTimeSlots,
        meetingType.duration,
        userSeed + i,
      );

      if (startHour !== null) {
        const startTime = new Date(date);
        startTime.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + meetingType.duration);

        usedTimeSlots.push({
          start: startHour,
          end: startHour + meetingType.duration / 60,
        });

        events.push({
          id: uuidv4(),
          title: meetingType.title,
          startTime,
          endTime,
          attendees: this.generateAttendees(userSeed + i),
          location: this.generateLocation(userSeed + i),
        });
      }
    }

    if ((userSeed + dayOfWeek) % 3 === 0) {
      const lunchTime = new Date(date);
      lunchTime.setHours(12, 0, 0, 0);
      const lunchEnd = new Date(lunchTime);
      lunchEnd.setHours(13, 0, 0, 0);

      events.push({
        id: uuidv4(),
        title: 'Lunch Break',
        startTime: lunchTime,
        endTime: lunchEnd,
      });
    }

    return events;
  }

  private findAvailableTimeSlot(
    workingHours: { start: number; end: number },
    usedSlots: Array<{ start: number; end: number }>,
    durationMinutes: number,
    seed: number,
  ): number | null {
    const durationHours = durationMinutes / 60;
    const possibleStarts: number[] = [];

    for (
      let hour = workingHours.start;
      hour <= workingHours.end - durationHours;
      hour += 0.5
    ) {
      const isAvailable = !usedSlots.some(
        (slot) =>
          (hour >= slot.start && hour < slot.end) ||
          (hour + durationHours > slot.start &&
            hour + durationHours <= slot.end) ||
          (hour <= slot.start && hour + durationHours >= slot.end),
      );

      if (isAvailable) {
        possibleStarts.push(hour);
      }
    }

    if (possibleStarts.length === 0) {
      return null;
    }

    return possibleStarts[seed % possibleStarts.length];
  }

  private generateAttendees(seed: number): string[] {
    const attendeePool = [
      'ada@koyejo.com',
      'bayo@koyejo.com',
      'charlie@koyejo.com',
      'omar@koyejo.com',
      'eve@koyejo.com',
      'frank@koyejo.com',
    ];

    const attendeeCount = (seed % 3) + 1;
    const attendees: string[] = [];

    for (let i = 0; i < attendeeCount; i++) {
      const attendee = attendeePool[(seed + i) % attendeePool.length];
      if (!attendees.includes(attendee)) {
        attendees.push(attendee);
      }
    }

    return attendees;
  }

  private generateLocation(seed: number): string {
    const locations = [
      'Conference Room A',
      'Conference Room B',
      'Zoom Meeting',
      'Google Meet',
      'Office 201',
      'Cafeteria',
      'Remote',
    ];

    return locations[seed % locations.length];
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
