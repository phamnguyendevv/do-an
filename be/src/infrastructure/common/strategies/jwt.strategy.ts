import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'

import { ExtractJwt, Strategy } from 'passport-jwt'

import { UserStatusEnum } from '@domain/entities/status.entity'
import { IJwtServicePayload } from '@domain/services/jwt.interface'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'
import { UserRepository } from '@infrastructure/databases/postgressql/repositories/user.repository'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { LoggerService } from '@infrastructure/logger/logger.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly logger: LoggerService,
    private readonly exceptionService: ExceptionsService,
    private readonly environmentConfigService: EnvironmentConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: environmentConfigService.getJwtSecret(),
    })
  }

  async validate(payload: IJwtServicePayload) {
    const user = await this.userRepository.getUserById(payload.id)

    if (!user) {
      this.logger.warn('JwtStrategy', 'User not found')
      this.exceptionService.unauthorizedException({
        type: 'Unauthorized',
        message: 'User not found',
      })
      return
    }
    if (user.status !== UserStatusEnum.Active) {
      this.logger.warn('JwtStrategy', 'User not active')
      this.exceptionService.unauthorizedException({
        type: 'Unauthorized',
        message: 'User not active',
      })
      return
    }

    return user
  }
}
