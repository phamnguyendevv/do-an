import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { PROVIDER_PROFILE_REPOSITORY } from '@domain/repositories/provider-profile.respository.interface'
import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'
import { MAILER_SERVICE } from '@domain/services/mailer.interface'

import { CreateNotificationUseCase } from '@use-cases/notification/create-notification.use-case'
import { CreateProviderUseCase } from '@use-cases/provider/create-provider.use-case'
import { GetListProviderUseCase } from '@use-cases/provider/get-list-provider.use-case'
import { UpdateProviderUseCase } from '@use-cases/provider/update-provider.use-case'
import { ChangePasswordUseCase } from '@use-cases/users/change-password.use-case'
import { GetListUsersUseCase } from '@use-cases/users/get-list-users.use-case'
import { UpdateUsersUseCase } from '@use-cases/users/update-user.use-case'

import { UsersController } from '@adapters/controllers/users/users.controller'

import { ProviderProfile } from '@infrastructure/databases/postgressql/entities/provider-profile.entity'
import { User } from '@infrastructure/databases/postgressql/entities/user.entity'
import { ProviderProfileRepository } from '@infrastructure/databases/postgressql/repositories/provider.repository'
import { UserRepository } from '@infrastructure/databases/postgressql/repositories/user.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { BcryptModule } from '@infrastructure/services/bcrypt/bcrypt.module'
import { CaslModule } from '@infrastructure/services/casl/casl.module'
import { MailerModule } from '@infrastructure/services/mailer/mailer.module'
import { NodeMailerService } from '@infrastructure/services/mailer/mailer.service'
import { StripeModule } from '@infrastructure/services/stripe/stripe.module'

import { NotificationModule } from './notification.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ProviderProfile]),
    CaslModule,
    BcryptModule,
    MailerModule,
    ExceptionsModule,
    StripeModule,
    NotificationModule,
  ],

  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },
    {
      provide: PROVIDER_PROFILE_REPOSITORY,
      useClass: ProviderProfileRepository,
    },
    {
      provide: MAILER_SERVICE,
      useClass: NodeMailerService,
    },

    GetListUsersUseCase,
    UpdateUsersUseCase,
    ChangePasswordUseCase,
    CreateProviderUseCase,
    UpdateProviderUseCase,
    GetListProviderUseCase,
    CreateNotificationUseCase,
  ],
})
export class UsersModule {}
