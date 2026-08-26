import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'

import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { IJwtServicePayload } from '@domain/services/jwt.interface'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'
import { UserRepository } from '@infrastructure/databases/postgressql/repositories/user.repository'
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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: environmentConfigService.getJwtRefreshSecret(),
      passReqToCallback: true,
    })
  }

  async validate(request: Request, payload: IJwtServicePayload) {
    const refreshToken = request.headers['authorization']
      ?.replace('Bearer', '')
      .trim()

    const user = await this.userRepository.getUserById(payload.id)
    if (!user) {
      this.logger.warn('JwtStrategy', 'User not found')
      this.exceptionService.unauthorizedException({
        type: 'Unauthorized',
        message: 'User not found',
      })
    }

    return { ...user, refreshToken }
  }
}
