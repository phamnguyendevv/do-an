import { Test, TestingModule } from '@nestjs/testing'

import { BcryptService } from '@infrastructure/services/bcrypt/bcrypt.service'

describe('BcryptService', () => {
  let service: BcryptService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BcryptService],
    }).compile()

    service = module.get<BcryptService>(BcryptService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should hash a password correctly', async () => {
    const passwordHashed = await service.hash('password')

    expect(await service.compare('password', passwordHashed)).toBe(true)
  })
})
