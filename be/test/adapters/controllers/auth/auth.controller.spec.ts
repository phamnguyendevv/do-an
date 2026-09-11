import { HttpException, HttpStatus } from '@nestjs/common'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'

import { AuthController } from '@adapters/controllers/auth/auth.controller'
import { LoginDto } from '@adapters/controllers/auth/dto/login.dto'

describe('AuthController', () => {
  const user = {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    role: UserRoleEnum.Admin,
    status: UserStatusEnum.Active,
    emailVerified: true,
  }

  const tokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  }

  const createController = (loginResult: unknown = { user, tokens }) => {
    const loginUseCase = {
      execute:
        loginResult instanceof Error
          ? jest.fn().mockRejectedValue(loginResult)
          : jest.fn().mockResolvedValue(loginResult),
    }

    return new AuthController(
      { getNodeEnv: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      loginUseCase as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
    )
  }

  it('should be defined', () => {
    expect(createController()).toBeDefined()
  })

  it('should login and set auth cookies', async () => {
    const controller = createController()
    const response = { cookie: jest.fn() }

    const result = await controller.login(
      { email: user.email, password: 'admin123' } as LoginDto,
      response as any,
    )

    expect(result.data.email).toBe(user.email)
    expect(result.token).toEqual(tokens)
    expect(response.cookie).toHaveBeenCalledTimes(2)
    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      tokens.accessToken,
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('should propagate login errors', async () => {
    const error = new HttpException('Test error', HttpStatus.BAD_REQUEST)
    const controller = createController(error)

    await expect(
      controller.login(
        { email: user.email, password: 'wrong' } as LoginDto,
        { cookie: jest.fn() } as any,
      ),
    ).rejects.toThrow('Test error')
  })
})
