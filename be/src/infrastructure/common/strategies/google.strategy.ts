import { Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'

import { Strategy, VerifyCallback } from 'passport-google-oauth2'

import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'
import { UserRepository } from '@infrastructure/databases/postgressql/repositories/user.repository'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly environmentConfigService: EnvironmentConfigService,
  ) {
    super({
      clientID: environmentConfigService.getGoogleClientId(),
      clientSecret: environmentConfigService.getGoogleClientSecret(),
      callbackURL: environmentConfigService.getClientUrl(),
      scope: ['profile', 'email'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile

    const user = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      picture: photos[0].value,
    }

    done(null, user)
  }
}
