import { MailerModule } from '@nestjs-modules/mailer'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { PROVIDER_PROFILE_REPOSITORY } from '@domain/repositories/provider-profile.respository.interface'
import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'
import { MAILER_SERVICE } from '@domain/services/mailer.interface'

import { GetMeUseCase } from '@use-cases/auth/get-me.use-case'
import { LoginOauthUseCase } from '@use-cases/auth/login-oauth.use-case'
import { LoginUseCase } from '@use-cases/auth/login.use-case'
import { RefreshUseCase } from '@use-cases/auth/refresh.use-case'
import { RegisterUseCase } from '@use-cases/auth/register.use-case'
import { SendVerifyEmailUseCase } from '@use-cases/auth/send-verify-email.use-case'
import { VerifyEmailUseCase } from '@use-cases/auth/verify-email.use-case'
import { CreateProviderUseCase } from '@use-cases/provider/create-provider.use-case'
import { ForgotPasswordUseCase } from '@use-cases/users/forgot-password.use-case'
import { ResetPasswordUseCase } from '@use-cases/users/reset-password.use-case'

import { AuthController } from '@adapters/controllers/auth/auth.controller'

import { GoogleStrategy } from '@infrastructure/common/strategies/google.strategy'
import { EnvironmentConfigModule } from '@infrastructure/config/environment/environment-config.module'
import { ProviderProfile } from '@infrastructure/databases/postgressql/entities/provider-profile.entity'
import { User } from '@infrastructure/databases/postgressql/entities/user.entity'
import { ProviderProfileRepository } from '@infrastructure/databases/postgressql/repositories/provider.repository'
import { UserRepository } from '@infrastructure/databases/postgressql/repositories/user.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { BcryptModule } from '@infrastructure/services/bcrypt/bcrypt.module'
import { JwtModule } from '@infrastructure/services/jwt/jwt.module'
import { NodeMailerService } from '@infrastructure/services/mailer/mailer.service'
import { StripeModule } from '@infrastructure/services/stripe/stripe.module'

import { NotificationModule } from '@modules/notification.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ProviderProfile]),
    EnvironmentConfigModule,
    JwtModule,
    BcryptModule,
    ExceptionsModule,
    MailerModule,
    StripeModule,
    NotificationModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: MAILER_SERVICE,
      useClass: NodeMailerService,
    },
    {
      provide: PROVIDER_PROFILE_REPOSITORY,
      useClass: ProviderProfileRepository,
    },
    GoogleStrategy,

    RegisterUseCase,
    GetMeUseCase,
    LoginUseCase,
    RefreshUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    LoginOauthUseCase,
    VerifyEmailUseCase,
    SendVerifyEmailUseCase,
    CreateProviderUseCase,
  ],
})
export class AuthModule {}
