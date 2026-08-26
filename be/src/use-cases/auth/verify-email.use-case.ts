import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

import { VerifyOtpDto } from '@adapters/controllers/auth/dto/verify-email.dto'

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(verifyOtpDto: VerifyOtpDto): Promise<boolean> {
    await this.checkOtp(verifyOtpDto)
    await this.verifyEmail(verifyOtpDto.email)
    await this.redisService.delValue(`otp:${verifyOtpDto.email}`)
    return true
  }
  private async checkOtp(payload: {
    email: string
    inputOtp: string
  }): Promise<void> {
    const key = `otp:${payload.email}`
    const storedOtp = await this.redisService.getValue(key)
    if (!storedOtp || storedOtp !== payload.inputOtp) {
      throw this.exceptionsService.notFoundException({
        type: 'OtpNotFoundException',
        message: 'Otp not found',
      })
    }
  }
  private async verifyEmail(email: string): Promise<void> {
    const user = await this.userRepository.getUserByEmail(email)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }
    const id = user.id
    await this.userRepository.updateUser(
      { id },
      {
        emailVerified: true,
        status: 1,
      },
    )
  }
}
