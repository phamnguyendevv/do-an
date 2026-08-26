import { Injectable } from '@nestjs/common'
import { JwtService as JwtServiceBase, JwtSignOptions } from '@nestjs/jwt'

import { IJwtService, IJwtServicePayload } from '@domain/services/jwt.interface'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'

@Injectable()
export class JwtService implements IJwtService {
  constructor(
    private readonly jwtServiceBase: JwtServiceBase,
    private readonly environmentConfigService: EnvironmentConfigService,
  ) {}

  async checkToken(token: string) {
    const decode = await this.jwtServiceBase.verifyAsync<IJwtServicePayload>(
      token,
      {
        secret: this.environmentConfigService.getJwtSecret(),
      },
    )
    return decode
  }

  async createToken(payload: IJwtServicePayload, type: 'access' | 'refresh') {
    let jwtSignOptions: JwtSignOptions

    if (type === 'refresh') {
      jwtSignOptions = {
        secret: this.environmentConfigService.getJwtRefreshSecret(),
        expiresIn: this.environmentConfigService.getJwtRefreshExpirationTime(),
      }
    } else {
      jwtSignOptions = {
        secret: this.environmentConfigService.getJwtSecret(),
        expiresIn: this.environmentConfigService.getJwtExpirationTime(),
      }
    }

    return await this.jwtServiceBase.signAsync(payload, jwtSignOptions)
  }
}
