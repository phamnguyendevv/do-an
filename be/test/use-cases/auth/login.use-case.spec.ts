import { Test, TestingModule } from '@nestjs/testing'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  AWS_COGNITO_SERVICE,
  IAwsCognitoService,
  ILoginUser,
} from '@domain/services/aws-cognito.interface'

import { LoginUseCase } from '@use-cases/auth/login.use-case'

describe('LoginUseCase', () => {
  let useCase: LoginUseCase
  let awsCognitoService: IAwsCognitoService
  let exceptionsService: IException

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: AWS_COGNITO_SERVICE,
          useValue: {
            authenticateUser: jest.fn(),
          },
        },
        {
          provide: EXCEPTIONS,
          useValue: {
            badRequestException: jest.fn(),
          },
        },
      ],
    }).compile()

    useCase = module.get<LoginUseCase>(LoginUseCase)
    awsCognitoService = module.get<IAwsCognitoService>(AWS_COGNITO_SERVICE)
    exceptionsService = module.get<IException>(EXCEPTIONS)
  })

  it('should call authenticateUser method of awsCognitoService with the payload', async () => {
    const payload: ILoginUser = {
      email: 'user@example.com',
      password: 'Password123!',
    }

    await useCase.execute(payload)

    expect(awsCognitoService.authenticateUser).toHaveBeenCalledWith(payload)
  })

  it('should call badRequestException method of exceptionsService when an error occurs', async () => {
    const payload: ILoginUser = {
      email: 'user@example.com',
      password: 'Password123!',
    }
    const error = new Error('Test error')

    ;(awsCognitoService.authenticateUser as jest.Mock).mockRejectedValueOnce(
      error,
    )

    await useCase.execute(payload)

    expect(exceptionsService.badRequestException).toHaveBeenCalledWith({
      type: error.name,
      message: error.message,
    })
  })
})
