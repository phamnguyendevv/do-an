import { Test, TestingModule } from '@nestjs/testing'

import { JwtStrategy } from '@infrastructure/common/strategies/jwt.strategy'
import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'
import { UserRepository } from '@infrastructure/databases/postgresql/repositories/user.repository'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { LoggerService } from '@infrastructure/logger/logger.service'

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: EnvironmentConfigService,
          useValue: { getJwtSecret: () => 'jwt-secret' },
        },
        { provide: LoggerService, useValue: { warn: jest.fn() } },
        {
          provide: ExceptionsService,
          useValue: { unauthorizedException: jest.fn() },
        },
        {
          provide: UserRepository,
          useValue: {
            getUserById: jest.fn().mockResolvedValue({
              id: 123,
              status: 1,
            }),
          },
        },
      ],
    }).compile()

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy)
  })

  it('should be defined', () => {
    expect(jwtStrategy).toBeDefined()
  })

  it('should validate payload correctly', async () => {
    const payload = { id: 123 }
    await expect(jwtStrategy.validate(payload)).resolves.toEqual({
      id: 123,
      status: 1,
    })
  })
})
