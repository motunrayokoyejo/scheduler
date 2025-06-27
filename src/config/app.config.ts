export const appConfig = () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    type: 'sqlite' as const,
    database: process.env.DATABASE_PATH || './data/scheduler.db',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  },
  scheduling: {
    defaults: {
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
      excludedDays: [0, 6], // Sunday and Saturday
      maxConversationsPerWeek: 3,
      minGapBetweenMeetings: 15, // minutes
      conversationDuration: 30, // minutes
      bufferTimeBeforeMeeting: 5, // minutes
    },
  },
});
