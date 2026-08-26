import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'
import { MAILER_SERVICE } from '@domain/services/mailer.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

import { NodeMailerService } from '@infrastructure/services/mailer/mailer.service'

@Injectable()
export class SendVerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
    @Inject(MAILER_SERVICE)
    private readonly nodeMailerService: NodeMailerService,
  ) {}

  async execute(email: string): Promise<boolean> {
    await this.verifyEmail(email)
    const otp = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')
    const key = `otp:${email}`

    await this.redisService.setValue(key, otp, 600)

    await this.nodeMailerService.sendMail(
      'nguyenpt2@hblab.vn',
      `Send Otp for App Scheduling:`,
      `Your OTP is: ${otp}. It will expire in 1 minutes.`,
    )

    return true
  }

  private async verifyEmail(email: string): Promise<void> {
    const user = await this.userRepository.getUserByEmail(email)
    if (!user) {
       throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }
  }
}
