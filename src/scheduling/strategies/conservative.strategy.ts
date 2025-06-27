import { Injectable } from '@nestjs/common';
import { BaseSchedulingStrategy } from './strategy.interface';
import {
  SchedulingMoment,
  SchedulingContext,
  SchedulingStrategy,
} from '../../common/interfaces';

@Injectable()
export class ConservativeStrategy extends BaseSchedulingStrategy {
  readonly name = SchedulingStrategy.CONSERVATIVE;

  async findOptimalMoments(
    context: SchedulingContext,
  ): Promise<SchedulingMoment[]> {
    const availableSlots = this.findAvailableTimeSlots(context);
    const moments: SchedulingMoment[] = [];

    const existingThisWeek = context.existingConversations.filter((conv) => {
      const convDate = new Date(conv.scheduledTime);
      const weekStart = new Date(context.targetWeekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return convDate >= weekStart && convDate <= weekEnd;
    });

    const remainingSlots =
      context.config.maxConversationsPerWeek - existingThisWeek.length;
    if (remainingSlots <= 0) {
      return [];
    }
    const qualitySlots = availableSlots.filter((slot) =>
      this.isHighQualitySlot(slot, context),
    );

    for (const slot of qualitySlots) {
      if (moments.length >= remainingSlots) {
        break;
      }
      const scheduledTime = this.findOptimalTimeInSlot(slot, context);
      const confidence = this.calculateConservativeConfidence(slot, context);
      const reason = this.generateConservativeReason(slot, context);

      moments.push({
        scheduledTime,
        confidence,
        reason,
        strategy: this.name,
      });
    }

    moments.sort((a, b) => b.confidence - a.confidence);

    const distributedMoments = this.distributeAcrossWeek(moments, context);

    return distributedMoments.slice(0, remainingSlots);
  }

  private isHighQualitySlot(slot: any, context: SchedulingContext): boolean {
    const minBufferTime = context.config.conversationDuration + 30;
    if (slot.duration < minBufferTime) {
      return false;
    }

    const dayOfWeek = slot.startTime.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 5) {
      return false;
    }

    const hour = slot.startTime.getHours();
    if (hour < 9 || hour > 16) {
      return false;
    }

    return true;
  }

  private findOptimalTimeInSlot(slot: any, context: SchedulingContext): Date {
    const bufferMinutes = 15;
    const optimalStart = new Date(
      slot.startTime.getTime() + bufferMinutes * 60 * 1000,
    );
    const latestStart = new Date(
      slot.endTime.getTime() - context.config.conversationDuration * 60 * 1000,
    );

    return optimalStart.getTime() <= latestStart.getTime()
      ? optimalStart
      : slot.startTime;
  }

  private calculateConservativeConfidence(
    slot: any,
    context: SchedulingContext,
  ): number {
    const strategyFactors = {
      bufferBonus:
        slot.duration > context.config.conversationDuration + 45 ? 0.3 : 0.1,
      midWeek: [2, 3, 4].includes(slot.startTime.getDay()) ? 0.2 : -0.1,
      primeTime: this.isPrimeTime(slot.startTime) ? 0.25 : 0,
      tightSchedule:
        slot.duration < context.config.conversationDuration + 30 ? -0.2 : 0,
    };

    return this.calculateConfidence(slot, context, strategyFactors);
  }

  private isPrimeTime(time: Date): boolean {
    const hour = time.getHours();
    return (hour >= 10 && hour <= 11) || (hour >= 14 && hour <= 15);
  }

  private generateConservativeReason(
    slot: any,
    context: SchedulingContext,
  ): string {
    const reasons: string[] = [];
    const hour = slot.startTime.getHours();
    const duration = Math.floor(slot.duration);
    const dayOfWeek = slot.startTime.getDay();
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    if ([2, 3, 4].includes(dayOfWeek)) {
      reasons.push(`Optimal ${dayNames[dayOfWeek]} scheduling`);
    }

    if (this.isPrimeTime(slot.startTime)) {
      reasons.push('Prime conversation time');
    } else if (hour >= 10 && hour <= 15) {
      reasons.push('Good time of day');
    }

    const bufferTime = duration - context.config.conversationDuration;
    if (bufferTime >= 45) {
      reasons.push(`Generous ${bufferTime}min buffer`);
    } else if (bufferTime >= 30) {
      reasons.push(`Adequate ${bufferTime}min buffer`);
    }

    reasons.push('Optimized for quality interaction');

    return reasons.join(', ');
  }

  private distributeAcrossWeek(
    moments: SchedulingMoment[],
    context: SchedulingContext,
  ): SchedulingMoment[] {
    const byDay = new Map<string, SchedulingMoment[]>();

    moments.forEach((moment) => {
      const day = moment.scheduledTime.toDateString();
      if (!byDay.has(day)) {
        byDay.set(day, []);
      }
      byDay.get(day)!.push(moment);
    });

    const distributed: SchedulingMoment[] = [];
    const maxPerDay = Math.ceil(context.config.maxConversationsPerWeek / 5);
    Array.from(byDay.values()).forEach((dayMoments) => {
      distributed.push(...dayMoments.slice(0, maxPerDay));
    });

    return distributed.sort((a, b) => b.confidence - a.confidence);
  }
}
