import { Inject, Injectable } from '@nestjs/common'

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

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(BCRYPT_SERVICE)
    private readonly bcryptService: IBcryptService,
    @Inject(JWT_SERVICE)
    private readonly jwtService: IJwtService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(payload: { email: string; password: string }) {
    const user = await this.userRepository.getUserByEmail(payload.email)
    if (!user)
      throw this.exceptionsService.badRequestException({
        type: 'BadRequest',
        message: 'User not found',
      })

    const passwordMatches = await this.bcryptService.compare(
      payload.password,
      user.password!,
    )

    if (!passwordMatches)
      throw this.exceptionsService.badRequestException({
        type: 'BadRequest',
        message: 'Password is incorrect',
      })
    if (user.status !== UserStatusEnum.Active) {
      throw this.exceptionsService.badRequestException({
        type: 'AccountDisabled',
        message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên!',
      })
    }

    const [tokens] = await Promise.all([
      this.createTokens(user.id),
      this.updateLoginTime(user.id),
    ])

    return { user, tokens }
  }

  private async updateLoginTime(userId: number) {
    await this.userRepository.updateLastLogin(userId)
  }

  private async createTokens(userId: number) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.createToken(
        {
          id: userId,
        },
        'access',
      ),
      this.jwtService.createToken(
        {
          id: userId,
        },
        'refresh',
      ),
    ])

    return {
      accessToken,
      refreshToken,
    }
  }
}
