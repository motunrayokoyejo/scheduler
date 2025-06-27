import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function seed() {
  console.log('🌱 Starting database seed...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    const users = await usersService.seedUsers();

    console.log(`Seeded ${users.length} users:`);
    users.forEach((user) => {
      console.log(`   - ${user.fullName} (${user.email})`);
      if (user.schedulingConfig) {
        console.log(
          `     Config: ${JSON.stringify(user.schedulingConfig, null, 2)}`,
        );
      }
    });

    console.log(
      '\n🎯 Seed complete! You can now test the API with these user IDs:',
    );
    users.forEach((user) => {
      console.log(`   - ${user.email}: ${user.id}`);
    });
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  seed();
}

export { seed };
