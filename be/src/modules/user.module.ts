import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'
import { MAILER_SERVICE } from '@domain/services/mailer.interface'

import { ChangePasswordUseCase } from '@use-cases/users/change-password.use-case'
import { CreateUserUseCase } from '@use-cases/users/create-user.use-case'
import { GetListUsersUseCase } from '@use-cases/users/get-list-users.use-case'
import { UpdateUsersUseCase } from '@use-cases/users/update-user.use-case'

import { UsersController } from '@adapters/controllers/users/users.controller'

import { User } from '@infrastructure/databases/postgresql/entities/user.entity'
import { UserRepository } from '@infrastructure/databases/postgresql/repositories/user.repository'
import { ExceptionsModule } from '@infrastructure/exceptions/exceptions.module'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { BcryptModule } from '@infrastructure/services/bcrypt/bcrypt.module'
import { CaslModule } from '@infrastructure/services/casl/casl.module'
import { MailerModule } from '@infrastructure/services/mailer/mailer.module'
import { NodeMailerService } from '@infrastructure/services/mailer/mailer.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CaslModule,
    BcryptModule,
    MailerModule,
    ExceptionsModule,
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
      provide: MAILER_SERVICE,
      useClass: NodeMailerService,
    },

    GetListUsersUseCase,
    UpdateUsersUseCase,
    ChangePasswordUseCase,
    CreateUserUseCase,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
