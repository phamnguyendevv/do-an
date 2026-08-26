import { Inject, Injectable } from '@nestjs/common'

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
  IRedisCacheService,
  REDIS_SERVICE,
} from '@domain/services/redis.interface'

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(BCRYPT_SERVICE)
    private readonly bcryptService: IBcryptService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisCacheService,
  ) {}

  async execute(params: {
    email: string
    inputOtp: string
    newPassword: string
  }): Promise<string> {
    await this.checkOtp(params)

    await this.updatePassword({
      email: params.email,
      newPassword: params.newPassword,
    })
    await this.redisService.delValue(`otp:${params.email}`)
    return 'Password reset successfully'
  }

  private async checkOtp(params: {
    email: string
    inputOtp: string
  }): Promise<void> {
    const key = `otp:${params.email}`

    const storedOtp = await this.redisService.getValue(key)
    if (!storedOtp || storedOtp !== params.inputOtp) {
      throw this.exceptionsService.notFoundException({
        type: 'OtpNotFoundException',
        message: 'Otp not found',
      })
    }
  }
  private async updatePassword(params: {
    email: string
    newPassword: string
  }): Promise<void> {
    const user = await this.userRepository.getUserByEmail(params.email)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }
    const userId = user.id
    const hashedPassword = await this.bcryptService.hash(params.newPassword)

    const updateUser = await this.userRepository.updateUser(
      { id: userId },
      { password: hashedPassword },
    )
    if (!updateUser) {
      throw this.exceptionsService.badRequestException({
        type: 'BadRequest',
        message: 'Failed to update password',
      })
    }
  }
}
