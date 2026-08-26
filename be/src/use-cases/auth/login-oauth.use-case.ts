import { Inject, Injectable } from '@nestjs/common'

import { UserRoleEnum } from '@domain/entities/role.entity'
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

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'

@Injectable()
export class LoginOauthUseCase {
  constructor(
    @Inject(BCRYPT_SERVICE)
    private readonly bcryptService: IBcryptService,
    @Inject(JWT_SERVICE)
    private readonly jwtService: IJwtService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    private readonly enviromentConfigService: EnvironmentConfigService,
  ) {}

  async execute(payload: { email: string; name: string }) {
    const urlfe = this.enviromentConfigService.getFEUrl()
    const user = await this.userRepository.getUserByEmail(payload.email)
    if (!user) {
      const passwordMatches = await this.bcryptService.hash('123456')
      const newUser = await this.userRepository.createUser({
        username: payload.name,
        email: payload.email,
        password: passwordMatches,
        role: UserRoleEnum.Client,
        status: UserStatusEnum.InActive,
        emailVerified: true,
      })

      const [tokens] = await Promise.all([
        this.createTokens(newUser.id),
        this.updateLoginTime(newUser.id),
      ])
      return {
        url: `${urlfe}/auth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`,
      }
    }

    const [tokens] = await Promise.all([
      this.createTokens(user.id),
      this.updateLoginTime(user.id),
    ])

    return {
      url: `${urlfe}/auth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`,
    }
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
