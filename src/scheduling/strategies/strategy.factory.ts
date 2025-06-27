import { Injectable } from '@nestjs/common';
import { SchedulingStrategy } from '../../common/interfaces';
import { ISchedulingStrategy } from './strategy.interface';
import { AggressiveStrategy } from './aggressive.strategy';
import { ConservativeStrategy } from './conservative.strategy';

@Injectable()
export class StrategyFactory {
  constructor(
    private readonly aggressiveStrategy: AggressiveStrategy,
    private readonly conservativeStrategy: ConservativeStrategy,
  ) {}

  getStrategy(strategyType: SchedulingStrategy): ISchedulingStrategy {
    switch (strategyType) {
      case SchedulingStrategy.AGGRESSIVE:
        return this.aggressiveStrategy;
      case SchedulingStrategy.CONSERVATIVE:
        return this.conservativeStrategy;
      default:
        throw new Error(`Unknown scheduling strategy: ${strategyType}`);
    }
  }

  getAllStrategies(): ISchedulingStrategy[] {
    return [this.aggressiveStrategy, this.conservativeStrategy];
  }

  getAvailableStrategyNames(): SchedulingStrategy[] {
    return Object.values(SchedulingStrategy);
  }
}
