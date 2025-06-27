import {
  IsEnum,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  IsString,
} from 'class-validator';
import { SchedulingStrategy, SchedulingMoment } from '../../common/interfaces';

export class FindOptimalMomentsDto {
  @IsUUID('4')
  userId: string;

  @IsOptional()
  @IsEnum(SchedulingStrategy)
  strategy?: SchedulingStrategy = SchedulingStrategy.CONSERVATIVE;

  @IsOptional()
  @IsDateString()
  weekStart?: string;
}

export class SchedulingMomentDto {
  scheduledTime: Date;
  confidence: number;
  reason: string;
  strategy: string;
}

export class FindOptimalMomentsResponseDto {
  userId: string;

  strategy: string;

  moments: SchedulingMoment[];
  weekRange: {
    start: Date;
    end: Date;
  };

  metadata: {
    totalSlotsAnalyzed: number;
    existingConversationsThisWeek: number;
    remainingCapacity: number;
    userConfig: any;
  };
}
export class ScheduleConversationDto {
  @IsUUID('4')
  userId: string;

  @IsDateString()
  scheduledTime: string;

  @IsNumber()
  confidence: number;

  @IsString()
  reason: string;

  @IsEnum(SchedulingStrategy)
  strategy: SchedulingStrategy;
}
