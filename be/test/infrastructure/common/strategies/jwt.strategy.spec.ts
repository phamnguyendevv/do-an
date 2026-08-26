import { Test, TestingModule } from '@nestjs/testing'

import { environmentConfigServiceMock } from 'test/mocks/services/environment-config-service.mock'

import { JwtStrategy } from '@infrastructure/common/strategies/jwt.strategy'
import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: EnvironmentConfigService,
          useValue: environmentConfigServiceMock,
        },
      ],
    }).compile()

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy)
  })

  it('should be defined', () => {
    expect(jwtStrategy).toBeDefined()
  })

  it('should validate payload correctly', () => {
    const payload = { sub: 'user123' }
    const validatedUser = jwtStrategy.validate(payload)
    expect(validatedUser).toEqual({ userId: 'user123' })
  })
})
