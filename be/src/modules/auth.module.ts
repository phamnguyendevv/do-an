import { MailerModule } from '@nestjs-modules/mailer'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'
import { MAILER_SERVICE } from '@domain/services/mailer.interface'

import { CheckUserExistenceUseCase } from '@use-cases/auth/check-user-existence.use-case'
import { GetMeUseCase } from '@use-cases/auth/get-me.use-case'
import { LoginOauthUseCase } from '@use-cases/auth/login-oauth.use-case'
import { LoginUseCase } from '@use-cases/auth/login.use-case'
import { RefreshUseCase } from '@use-cases/auth/refresh.use-case'
import { RegisterUseCase } from '@use-cases/auth/register.use-case'
import { SendVerifyEmailUseCase } from '@use-cases/auth/send-verify-email.use-case'
import { VerifyEmailUseCase } from '@use-cases/auth/verify-email.use-case'
import { ForgotPasswordUseCase } from '@use-cases/users/forgot-password.use-case'
import { ResetPasswordUseCase } from '@use-cases/users/reset-password.use-case'
import { VerifyResetOtpUseCase } from '@use-cases/users/verify-reset-otp.use-case'

import { AuthController } from '@adapters/controllers/auth/auth.controller'

import { GoogleStrategy } from '@infrastructure/common/strategies/google.strategy'
import { EnvironmentConfigModule } from '@infrastructure/config/environment/environment-config.module'
import { User } from '@infrastructure/databases/postgresql/entities/user.entity'
import { UserRepository } from '@infrastructure/databases/postgresql/repositories/user.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { BcryptModule } from '@infrastructure/services/bcrypt/bcrypt.module'
import { JwtModule } from '@infrastructure/services/jwt/jwt.module'
import { NodeMailerService } from '@infrastructure/services/mailer/mailer.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EnvironmentConfigModule,
    JwtModule,
    BcryptModule,
    ExceptionsModule,
    MailerModule,
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
    GoogleStrategy,

    RegisterUseCase,
    CheckUserExistenceUseCase,
    GetMeUseCase,
    LoginUseCase,
    RefreshUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    VerifyResetOtpUseCase,
    LoginOauthUseCase,
    VerifyEmailUseCase,
    SendVerifyEmailUseCase,
  ],
})
export class AuthModule {}
