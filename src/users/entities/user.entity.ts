import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SchedulingConfig } from '../../common/interfaces';
import { ScheduledConversation } from '../../scheduling/entities/scheduled-conversation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column('json', { nullable: true })
  schedulingConfig: Partial<SchedulingConfig>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ScheduledConversation, (conversation) => conversation.user)
  scheduledConversations: ScheduledConversation[];

  get fullName(): string {
    return (
      [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email
    );
  }
}
