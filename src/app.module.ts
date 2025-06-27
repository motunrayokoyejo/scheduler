import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SchedulingModule } from './scheduling/scheduling.module';
import { UsersModule } from './users/users.module';
import { CalendarModule } from './calendar/calendar.module';
import { ConfigurationModule } from './config/configuration.module';
import { DatabaseModule } from './database/database.module';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    DatabaseModule,
    ConfigurationModule,
    UsersModule,
    CalendarModule,
    SchedulingModule,
  ],
})
export class AppModule {}
