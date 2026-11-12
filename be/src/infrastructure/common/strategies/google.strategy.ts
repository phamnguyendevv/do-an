import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'

import { Strategy, VerifyCallback } from 'passport-google-oauth2'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name)

  constructor(environmentConfigService: EnvironmentConfigService) {
    const clientID = environmentConfigService.getGoogleClientId()
    const clientSecret = environmentConfigService.getGoogleClientSecret()
    // Google login is optional: passport-google-oauth2 throws if clientID
    // is empty, which used to crash the whole backend at startup. Use a
    // placeholder when credentials are missing so the app still starts;
    // Google login will simply fail at Google until real credentials
    // are configured.
    super({
      clientID: clientID || 'google-oauth-disabled',
      clientSecret: clientSecret || 'google-oauth-disabled',
      callbackURL:
        environmentConfigService.getClientUrl() ||
        'https://api.zymail.site/auth/google/callback',
      scope: ['profile', 'email'],
    })
    if (!clientID || !clientSecret) {
      this.logger.warn(
        'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not configured, Google login is disabled. Backend will still start.',
      )
    }
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
