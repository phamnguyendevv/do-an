import { Inject, Injectable } from '@nestjs/common'

import { IVerifyOtpInput } from '@domain/entities/auth.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

@Injectable()
export class VerifyResetOtpUseCase {
  constructor(
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(params: IVerifyOtpInput): Promise<boolean> {
    const key = `otp:${params.email}`
    const storedOtp = await this.redisService.getValue<string>(key)

    if (
      !storedOtp ||
      String(storedOtp).trim() !== String(params.inputOtp).trim()
    ) {
      throw this.exceptionsService.badRequestException({
        type: 'OtpInvalidException',
        message: 'Mã OTP không chính xác hoặc đã hết hạn',
      })
    }

    return true
  }
}
