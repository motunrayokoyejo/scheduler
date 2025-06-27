import { Injectable } from '@nestjs/common';
import { BaseSchedulingStrategy } from './strategy.interface';
import {
  SchedulingMoment,
  SchedulingContext,
  SchedulingStrategy,
} from '../../common/interfaces';

@Injectable()
export class AggressiveStrategy extends BaseSchedulingStrategy {
  readonly name = SchedulingStrategy.AGGRESSIVE;

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

    for (const slot of availableSlots) {
      if (moments.length >= remainingSlots) {
        break;
      }

      if (slot.duration >= context.config.conversationDuration) {
        const scheduledTime = new Date(slot.startTime);

        const confidence = this.calculateAggressiveConfidence(slot, context);
        const reason = this.generateAggressiveReason(slot, context);

        moments.push({
          scheduledTime,
          confidence,
          reason,
          strategy: this.name,
        });
      }
    }
    moments.sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime(),
    );

    return moments.slice(0, remainingSlots);
  }

  private calculateAggressiveConfidence(
    slot: any,
    context: SchedulingContext,
  ): number {
    const strategyFactors = {
      urgency: 0.2,
      shortSlot: slot.duration < 45 ? -0.1 : 0,
      morning: slot.startTime.getHours() < 12 ? 0.15 : 0,
    };

    return this.calculateConfidence(slot, context, strategyFactors);
  }

  private generateAggressiveReason(
    slot: any,
    context: SchedulingContext,
  ): string {
    const reasons: string[] = [];
    const hour = slot.startTime.getHours();
    const duration = Math.floor(slot.duration);

    if (hour < 10) {
      reasons.push('Early morning slot available');
    } else if (hour < 12) {
      reasons.push('Mid-morning availability');
    } else if (hour < 14) {
      reasons.push('Early afternoon opening');
    } else {
      reasons.push('Afternoon time slot');
    }

    if (duration >= 60) {
      reasons.push(`${duration}-minute window available`);
    } else if (duration >= context.config.conversationDuration + 15) {
      reasons.push('Adequate time buffer');
    } else {
      reasons.push('Minimal but sufficient time');
    }

    reasons.push('Prioritizing immediate scheduling');

    return reasons.join(', ');
  }
}
