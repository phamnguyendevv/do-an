import { Test, TestingModule } from '@nestjs/testing'

import { UserStatusEnum } from '@domain/entities/status.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'
import {
  BCRYPT_SERVICE,
  IBcryptService,
} from '@domain/services/bcrypt.interface'
import { IJwtService, JWT_SERVICE } from '@domain/services/jwt.interface'
import { LoginUseCase } from '@use-cases/auth/login.use-case'

describe('LoginUseCase', () => {
  let useCase: LoginUseCase
  let bcryptService: IBcryptService
  let jwtService: IJwtService
  let userRepository: IUserRepositoryInterface
  let exceptionsService: IException

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: BCRYPT_SERVICE,
          useValue: {
            compare: jest.fn(),
          },
        },
        {
          provide: JWT_SERVICE,
          useValue: {
            createToken: jest.fn(),
          },
        },
        {
          provide: USER_REPOSITORY,
          useValue: {
            getUserByEmail: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: EXCEPTIONS,
          useValue: {
            badRequestException: jest.fn((err) => new Error(err.message)),
          },
        },
      ],
    }).compile()

    useCase = module.get<LoginUseCase>(LoginUseCase)
    bcryptService = module.get<IBcryptService>(BCRYPT_SERVICE)
    jwtService = module.get<IJwtService>(JWT_SERVICE)
    userRepository = module.get<IUserRepositoryInterface>(USER_REPOSITORY)
    exceptionsService = module.get<IException>(EXCEPTIONS)
  })

  it('should login successfully with valid credentials', async () => {
    const mockUser = {
      id: 1,
      email: 'admin@example.com',
      password: 'hashedpassword',
      status: UserStatusEnum.Active,
    }

    jest.spyOn(userRepository, 'getUserByEmail').mockResolvedValue(mockUser as any)
    jest.spyOn(bcryptService, 'compare').mockResolvedValue(true)
    jest.spyOn(jwtService, 'createToken').mockResolvedValue('test_token')
    jest.spyOn(userRepository, 'updateLastLogin').mockResolvedValue(mockUser as any)

    const result = await useCase.execute({
      email: 'admin@example.com',
      password: 'adminpassword',
    })

    expect(result.user).toEqual(mockUser)
    expect(result.tokens).toEqual({
      accessToken: 'test_token',
      refreshToken: 'test_token',
    })
  })

  it('should throw error when user not found', async () => {
    jest.spyOn(userRepository, 'getUserByEmail').mockResolvedValue(null)

    await expect(
      useCase.execute({
        email: 'notfound@example.com',
        password: 'pass',
      }),
    ).rejects.toThrow('User not found')
  })
})
