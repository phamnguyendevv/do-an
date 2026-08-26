import { Inject, Injectable } from '@nestjs/common'

import { UserEntity } from '@domain/entities/user.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'
import {
  BCRYPT_SERVICE,
  IBcryptService,
} from '@domain/services/bcrypt.interface'

import { ChangePasswordDto } from '@adapters/controllers/users/dto/change-password.dto'

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(BCRYPT_SERVICE)
    private readonly bcryptService: IBcryptService,
  ) {}

  async execute(
    params: { id: number },
    userPayload: ChangePasswordDto,
  ): Promise<boolean> {
    await this.checkPassword(params, userPayload)
    // Hash the new password
    userPayload.password = await this.bcryptService.hash(userPayload.password)
    return await this.userRepository.updateUser(params, {
      password: userPayload.password,
    })
  }

  private async checkPassword(
    params: { id: number },
    userPayload: ChangePasswordDto,
  ): Promise<void> {
    const { id } = params
    const { oldPassword, password, confirmPassword } = userPayload

    // Validate input fields
    if (!oldPassword || !password || !confirmPassword) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidInputException',
        message: 'Old password, new password, and confirmation are required',
      })
    }

    if (password !== confirmPassword) {
      throw this.exceptionsService.badRequestException({
        type: 'PasswordMismatchException',
        message: 'New password and confirmation do not match',
      })
    }

    // Check user exists
    const user = await this.userRepository.getUserById(id)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }

    // Verify old password
    const isMatch = await this.bcryptService.compare(
      oldPassword,
      user.password!,
    )
    if (!isMatch) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidPasswordException',
        message: 'Old password is incorrect',
      })
    }

    // Check new password isn't same as old
    const isSamePassword = await this.bcryptService.compare(
      password,
      user.password!,
    )
    if (isSamePassword) {
      throw this.exceptionsService.badRequestException({
        type: 'SamePasswordException',
        message: 'New password cannot be the same as the old password',
      })
    }
  }
}
