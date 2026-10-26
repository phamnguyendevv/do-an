import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'

import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserStatusEnum } from '@domain/entities/status.entity'
import { IJwtServicePayload } from '@domain/services/jwt.interface'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'
import { UserRepository } from '@infrastructure/databases/postgresql/repositories/user.repository'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { LoggerService } from '@infrastructure/logger/logger.service'

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly environmentConfigService: EnvironmentConfigService,
    private readonly logger: LoggerService,
    private readonly exceptionService: ExceptionsService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request | undefined) => {
          if (!request) return null
          return (
            (request.cookies as Record<string, string> | undefined)?.[
              'refresh_token'
            ] ?? null
          )
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: environmentConfigService.getJwtRefreshSecret(),
      passReqToCallback: true,
    })
  }

  async validate(request: Request, payload: IJwtServicePayload) {
    const refreshToken =
      (request?.cookies &&
        (request.cookies as Record<string, string>)['refresh_token']) ||
      String(request.headers['authorization'] || '')
        .replace('Bearer', '')
        .trim() ||
      undefined

    const user = await this.userRepository.getUserById(payload.id)
    if (!user) {
      this.logger.warn('JwtRefreshStrategy', 'User not found')
      this.exceptionService.unauthorizedException({
        type: 'Unauthorized',
        message: 'User not found',
      })
      return
    }

    if (user.status !== UserStatusEnum.Active) {
      this.logger.warn('JwtRefreshStrategy', 'User not active')
      this.exceptionService.unauthorizedException({
        type: 'Unauthorized',
        message: 'Tài khoản đã bị vô hiệu hóa',
      })
      return
    }

    return { ...user, refreshToken }
  }
}
