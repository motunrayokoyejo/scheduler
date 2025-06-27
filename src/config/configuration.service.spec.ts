import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigurationService } from './configuration.service';
import { UsersService } from '../users/users.service';
import { SchedulingConfig } from '../common/interfaces';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let configService: jest.Mocked<ConfigService>;
  let usersService: jest.Mocked<UsersService>;

  const mockSystemDefaults: SchedulingConfig = {
    workingHours: { start: '09:00', end: '17:00' },
    excludedDays: [0, 6],
    maxConversationsPerWeek: 3,
    minGapBetweenMeetings: 15,
    conversationDuration: 30,
    bufferTimeBeforeMeeting: 5,
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
    configService = module.get(ConfigService);
    usersService = module.get(UsersService);

    configService.get.mockReturnValue(mockSystemDefaults);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSystemDefaults', () => {
    it('should return system default configuration', () => {
      const result = service.getSystemDefaults();
      expect(result).toEqual(mockSystemDefaults);
      expect(configService.get).toHaveBeenCalledWith('scheduling.defaults');
    });
  });

  describe('getSchedulingConfig', () => {
    it('should throw error when user not found', async () => {
      usersService.findById.mockRejectedValue(new Error('User not found'));

      await expect(
        service.getSchedulingConfig('invalid-user-id'),
      ).rejects.toThrow('User not found');
    });

    it('should merge user config with system defaults', async () => {
      const mockUser = {
        id: '6bd6efb34a93',
        email: 'motun@example.com',
        schedulingConfig: {
          workingHours: { start: '08:00', end: '16:00' },
          maxConversationsPerWeek: 2,
        },
        scheduledConversations: [],
      };

      usersService.findById.mockResolvedValue(mockUser as any);

      const result = await service.getSchedulingConfig('6bd6efb34a93');

      expect(result).toEqual({
        workingHours: { start: '08:00', end: '16:00' },
        excludedDays: [0, 6],
        maxConversationsPerWeek: 2,
        minGapBetweenMeetings: 15,
        conversationDuration: 30,
        bufferTimeBeforeMeeting: 5,
      });
    });

    it('should handle partial user configuration', async () => {
      const mockUser = {
        id: '6bd6efb34a93',
        email: 'me@motun.com',
        schedulingConfig: {
          excludedDays: [0, 1, 6],
        },
        scheduledConversations: [],
      };

      usersService.findById.mockResolvedValue(mockUser as any);

      const result = await service.getSchedulingConfig('6bd6efb34a93');

      expect(result.excludedDays).toEqual([0, 1, 6]);
      expect(result.workingHours).toEqual(mockSystemDefaults.workingHours);
      expect(result.maxConversationsPerWeek).toEqual(
        mockSystemDefaults.maxConversationsPerWeek,
      );
    });
  });

  describe('validateConfig', () => {
    it('should return no errors for valid configuration', () => {
      const validConfig = {
        workingHours: { start: '09:00', end: '17:00' },
        excludedDays: [0, 6],
        maxConversationsPerWeek: 3,
      };

      const errors = service.validateConfig(validConfig);
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid time format', () => {
      const invalidConfig = {
        workingHours: { start: '25:00', end: '9:00' },
      };

      const errors = service.validateConfig(invalidConfig);
      expect(errors).toContain('workingHours.start must be in HH:MM format');
    });

    it('should return error when start time is after end time', () => {
      const invalidConfig = {
        workingHours: { start: '17:00', end: '09:00' },
      };

      const errors = service.validateConfig(invalidConfig);
      expect(errors).toContain(
        'workingHours.start must be before workingHours.end',
      );
    });

    it('should return errors for invalid excluded days', () => {
      const invalidConfig = {
        excludedDays: [-1, 7, 8],
      };

      const errors = service.validateConfig(invalidConfig);
      expect(errors).toContain(
        'excludedDays must contain values between 0 (Sunday) and 6 (Saturday)',
      );
    });

    it('should return errors for negative values', () => {
      const invalidConfig = {
        maxConversationsPerWeek: -1,
        minGapBetweenMeetings: -5,
        conversationDuration: 0,
      };

      const errors = service.validateConfig(invalidConfig);
      expect(errors).toContain('maxConversationsPerWeek must be non-negative');
      expect(errors).toContain('minGapBetweenMeetings must be non-negative');
      expect(errors).toContain('conversationDuration must be positive');
    });
  });
});
