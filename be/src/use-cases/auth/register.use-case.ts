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
  ) { }

  async execute(payload: RegisterDto) {
    const trimmedEmail = payload.email?.trim()
    const trimmedUsername = payload.username?.trim()
    const trimmedPhone = payload.phone?.trim()

    // 1. Kiểm tra Email
    if (trimmedEmail) {
      const existingEmail = await this.userRepository.getUserByEmail(trimmedEmail)
      if (existingEmail) {
        throw this.exceptionsService.badRequestException({
          type: 'BadRequest',
          message: 'Địa chỉ email này đã được sử dụng.',
        })
      }
    }

    // 2. Kiểm tra Họ và tên
    if (trimmedUsername) {
      const existingUsername = await this.userRepository.getUserByUsername(trimmedUsername)
      if (existingUsername) {
        throw this.exceptionsService.badRequestException({
          type: 'BadRequest',
          message: 'Họ và tên đã tồn tại trong hệ thống.',
        })
      }
    }

    // 3. Kiểm tra Số điện thoại
    if (trimmedPhone) {
      const existingPhone = await this.userRepository.getUserByPhone(trimmedPhone)
      if (existingPhone) {
        throw this.exceptionsService.badRequestException({
          type: 'BadRequest',
          message: 'Số điện thoại này đã được sử dụng.',
        })
      }
    }

    const passwordMatches = await this.bcryptService.hash(payload.password)

    const pendingUserData = {
      username: trimmedUsername || '',
      email: trimmedEmail,
      phone: trimmedPhone || undefined,
      password: passwordMatches,
      role: payload.role || UserRoleEnum.Client,
      status: UserStatusEnum.Active,
      emailVerified: true,
      isProvider: false,
    }

    const otp = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')
    const key = `otp:${trimmedEmail}`
    const pendingKey = `pending_registration:${trimmedEmail}`

    await Promise.all([
      this.redisService.setValue(key, otp, 300),
      this.redisService.setValue(pendingKey, JSON.stringify(pendingUserData), 300),
    ])

    // Gửi email xác thực trong background, không block API response
    this.mailerService
      .sendMail(
        trimmedEmail,
        'Verify your email',
        `Otp for verifying your email is: ${otp}`,
      )
      .catch((err) => {
        console.error('Failed to send verification email:', err)
      })

    return {
      message: 'User registered successfully',
    }
  }
}
