import { Inject, Injectable } from '@nestjs/common'

import { IVerifyOtpInput } from '@domain/entities/auth.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'
import {
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

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

  async execute(input: IVerifyOtpInput): Promise<boolean> {
    const trimmedEmail = input.email.trim()
    await this.checkOtp({
      email: trimmedEmail,
      inputOtp: input.inputOtp.trim(),
    })

    const pendingKey = `pending_registration:${trimmedEmail}`
    const pendingDataRaw = await this.redisService.getValue<string>(pendingKey)

    if (pendingDataRaw) {
      try {
        const pendingUserData = JSON.parse(pendingDataRaw)
        const existingUser =
          await this.userRepository.getUserByEmail(trimmedEmail)
        if (!existingUser) {
          // Lưu tài khoản vào database chỉ khi xác thực OTP thành công
          await this.userRepository.createUser(pendingUserData)
        } else {
          await this.userRepository.updateUser(
            { id: existingUser.id },
            {
              emailVerified: true,
              status: 1,
            },
          )
        }
      } catch (err) {
        throw this.exceptionsService.internalServerErrorException({
          type: 'InternalServerError',
          message: 'Không thể tạo tài khoản người dùng',
        })
      } finally {
        await this.redisService.delValue(pendingKey)
      }
    } else {
      // Trường hợp xác thực email cho tài khoản đã có sẵn
      await this.verifyEmail(trimmedEmail)
    }

    await this.redisService.delValue(`otp:${trimmedEmail}`)
    return true
  }

  private async checkOtp(payload: {
    email: string
    inputOtp: string
  }): Promise<void> {
    const key = `otp:${payload.email}`
    const storedOtp = await this.redisService.getValue(key)
    if (!storedOtp || storedOtp !== payload.inputOtp) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidOtpException',
        message: 'Mã OTP không chính xác hoặc đã hết hạn.',
      })
    }
  }

  private async verifyEmail(email: string): Promise<void> {
    const user = await this.userRepository.getUserByEmail(email)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'Không tìm thấy tài khoản người dùng.',
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
