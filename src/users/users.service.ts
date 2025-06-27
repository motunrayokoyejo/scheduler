import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SchedulingConfig } from '../common/interfaces';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['scheduledConversations'],
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['scheduledConversations'],
    });
  }

  async create(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    schedulingConfig?: Partial<SchedulingConfig>;
  }): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async updateSchedulingConfig(
    userId: string,
    config: Partial<SchedulingConfig>,
  ): Promise<User> {
    const user = await this.findById(userId);
    user.schedulingConfig = { ...user.schedulingConfig, ...config };
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      relations: ['scheduledConversations'],
    });
  }

  async seedUsers(): Promise<User[]> {
    const existingUsers = await this.userRepository.count();
    if (existingUsers > 0) {
      return this.findAll();
    }

    const seedUsers = [
      {
        email: 'motune@koyejo.com',
        firstName: 'Motunrayo',
        lastName: 'Koyejo',
        schedulingConfig: {
          workingHours: { start: '08:00', end: '16:00' },
          maxConversationsPerWeek: 2,
        },
      },
      {
        email: 'alayo@motune.com',
        firstName: 'Alayo',
        lastName: 'Koyejo',
        schedulingConfig: {
          excludedDays: [0, 1, 6],
          minGapBetweenMeetings: 30,
        },
      },
      {
        email: 'bimpe@motune.com',
        firstName: 'Bimpe',
        lastName: 'Koyejo',
      },
    ];

    const users = [];
    for (const userData of seedUsers) {
      const user = await this.create(userData);
      users.push(user);
    }

    return users;
  }
}
