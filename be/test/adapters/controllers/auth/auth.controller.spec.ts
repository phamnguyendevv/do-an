import { Test, TestingModule } from '@nestjs/testing'

import {
  ID_TOKEN_MOCK,
  REFRESH_TOKEN_MOCK,
  awsCognitoServiceMock,
} from 'test/mocks/services/aws-cognito.service.mock'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { AWS_COGNITO_SERVICE } from '@domain/services/aws-cognito.interface'

import { GetNewIdTokenUseCase } from '@use-cases/auth/get-new-id-token.use-case'
import { LoginUseCase } from '@use-cases/auth/login.use-case'

import { AuthController } from '@adapters/controllers/auth/auth.controller'
import { LoginDto } from '@adapters/controllers/auth/dto/login.dto'
import { RefreshDto } from '@adapters/controllers/auth/dto/refresh.dto'
import { LoginPresenter } from '@adapters/controllers/auth/presenters/login.presenter'
import { RefreshPresenter } from '@adapters/controllers/auth/presenters/refresh.presenter'

describe('AuthController', () => {
  let controller: AuthController
  let loginUseCase: LoginUseCase
  let getNewIdTokenUseCase: GetNewIdTokenUseCase

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AWS_COGNITO_SERVICE,
          useValue: awsCognitoServiceMock,
        },
        {
          provide: EXCEPTIONS,
          useValue: {
            unauthorizedException: jest.fn(),
          },
        },
        LoginUseCase,
        GetNewIdTokenUseCase,
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    loginUseCase = module.get<LoginUseCase>(LoginUseCase)
    getNewIdTokenUseCase =
      module.get<GetNewIdTokenUseCase>(GetNewIdTokenUseCase)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('login', () => {
    it('should return a LoginPresenter', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: 'password',
      }
      const loginPresenter = new LoginPresenter({
        accessToken: ID_TOKEN_MOCK,
        refreshToken: REFRESH_TOKEN_MOCK,
      })
      jest.spyOn(loginUseCase, 'execute').mockResolvedValue({
        idToken: ID_TOKEN_MOCK,
        refreshToken: REFRESH_TOKEN_MOCK,
      })

      const result = await controller.login(loginDto)

      expect(result).toEqual(loginPresenter)
    })

    it('should throw an error if loginUseCase.execute throws an error', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: 'password',
      }
      jest.spyOn(loginUseCase, 'execute').mockImplementation(() => {
        throw new Error('Test error')
      })

      await expect(controller.login(loginDto)).rejects.toThrow('Test error')
    })
  })

  describe('refresh', () => {
    it('should return a RefreshPresenter', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'refresh-token',
      }
      const refreshPresenter = new RefreshPresenter({
        accessToken: 'access-token',
      })
      jest
        .spyOn(getNewIdTokenUseCase, 'execute')
        .mockResolvedValue(refreshPresenter.accessToken)

      const result = await controller.refresh(refreshDto)

      expect(result).toEqual(refreshPresenter)
    })

    it('should throw an error if getNewIdTokenUseCase.execute throws an error', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'refresh-token',
      }

      jest.spyOn(getNewIdTokenUseCase, 'execute').mockImplementation(() => {
        throw new Error('Test error')
      })

      await expect(controller.refresh(refreshDto)).rejects.toThrow('Test error')
    })
  })
})
