import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { SchedulingConfig, IConfigurationService } from '../common/interfaces';

@Injectable()
export class ConfigurationService implements IConfigurationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  getSystemDefaults(): SchedulingConfig {
    return this.configService.get<SchedulingConfig>('scheduling.defaults');
  }

  async getSchedulingConfig(userId: string): Promise<SchedulingConfig> {
    const systemDefaults = this.getSystemDefaults();

    const user = await this.usersService.findById(userId);

    return this.mergeConfigs(systemDefaults, user.schedulingConfig || {});
  }

  private mergeConfigs(
    systemConfig: SchedulingConfig,
    userConfig: Partial<SchedulingConfig>,
  ): SchedulingConfig {
    return {
      workingHours: {
        start:
          userConfig.workingHours?.start || systemConfig.workingHours.start,
        end: userConfig.workingHours?.end || systemConfig.workingHours.end,
      },
      excludedDays:
        userConfig.excludedDays !== undefined
          ? userConfig.excludedDays
          : systemConfig.excludedDays,
      maxConversationsPerWeek:
        userConfig.maxConversationsPerWeek !== undefined
          ? userConfig.maxConversationsPerWeek
          : systemConfig.maxConversationsPerWeek,
      minGapBetweenMeetings:
        userConfig.minGapBetweenMeetings !== undefined
          ? userConfig.minGapBetweenMeetings
          : systemConfig.minGapBetweenMeetings,
      conversationDuration:
        userConfig.conversationDuration !== undefined
          ? userConfig.conversationDuration
          : systemConfig.conversationDuration,
      bufferTimeBeforeMeeting:
        userConfig.bufferTimeBeforeMeeting !== undefined
          ? userConfig.bufferTimeBeforeMeeting
          : systemConfig.bufferTimeBeforeMeeting,
    };
  }

  validateConfig(config: Partial<SchedulingConfig>): string[] {
    const errors: string[] = [];

    if (config.workingHours) {
      const { start, end } = config.workingHours;
      if (start && !this.isValidTimeFormat(start)) {
        errors.push('workingHours.start must be in HH:MM format');
      }
      if (end && !this.isValidTimeFormat(end)) {
        errors.push('workingHours.end must be in HH:MM format');
      }
      if (
        start &&
        end &&
        this.isValidTimeFormat(start) &&
        this.isValidTimeFormat(end) &&
        start >= end
      ) {
        errors.push('workingHours.start must be before workingHours.end');
      }
    }

    if (
      config.excludedDays &&
      config.excludedDays.some((day) => day < 0 || day > 6)
    ) {
      errors.push(
        'excludedDays must contain values between 0 (Sunday) and 6 (Saturday)',
      );
    }

    if (
      config.maxConversationsPerWeek !== undefined &&
      config.maxConversationsPerWeek < 0
    ) {
      errors.push('maxConversationsPerWeek must be non-negative');
    }

    if (
      config.minGapBetweenMeetings !== undefined &&
      config.minGapBetweenMeetings < 0
    ) {
      errors.push('minGapBetweenMeetings must be non-negative');
    }

    if (
      config.conversationDuration !== undefined &&
      config.conversationDuration <= 0
    ) {
      errors.push('conversationDuration must be positive');
    }

    return errors;
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }
}
