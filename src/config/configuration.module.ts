import { Module } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
