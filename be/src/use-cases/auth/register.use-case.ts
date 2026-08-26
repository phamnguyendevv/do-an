import { Inject, Injectable } from '@nestjs/common'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'
import {
  BCRYPT_SERVICE,
  IBcryptService,
} from '@domain/services/bcrypt.interface'
import {
  IMailerService,
  MAILER_SERVICE,
} from '@domain/services/mailer.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

import { RegisterDto } from '@adapters/controllers/auth/dto/register.dto'

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(BCRYPT_SERVICE)
    private readonly bcryptService: IBcryptService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(MAILER_SERVICE)
    private readonly mailerService: IMailerService,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(payload: RegisterDto) {
    const user = await this.userRepository.getUserByEmail(payload.email)
    if (user)
      throw this.exceptionsService.badRequestException({
        type: 'BadRequest',
        message: 'User have existed ',
      })

    const passwordMatches = await this.bcryptService.hash(payload.password)

    const newUser = await this.userRepository.createUser({
      username: payload.username || '',
      email: payload.email,
      password: passwordMatches,
      role: payload.role || UserRoleEnum.Client,
      status: UserStatusEnum.InActive,
      emailVerified: false,
      isProvider: false,
    })

    const otp = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')
    const key = `otp:${payload.email}`

    await this.redisService.setValue(key, otp, 600)

    await this.mailerService.sendMail(
      newUser.email,
      'Verify your email',
      `Otp for verifying your email is: ${otp}`,
    )

    return {
      message: 'User registered successfully',
    }
  }
}
