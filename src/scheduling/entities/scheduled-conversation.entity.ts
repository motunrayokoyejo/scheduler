import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SchedulingStrategy } from '../../common/interfaces';

@Entity('scheduled_conversations')
export class ScheduledConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  scheduledTime: Date;

  @Column('decimal', { precision: 3, scale: 2 })
  confidence: number;

  @Column('text')
  reason: string;

  @Column({
    type: 'varchar',
    enum: SchedulingStrategy,
  })
  strategy: SchedulingStrategy;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  isCancelled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.scheduledConversations)
  @JoinColumn({ name: 'userId' })
  user: User;
}
