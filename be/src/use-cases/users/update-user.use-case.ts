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

@Injectable()
export class UpdateUsersUseCase {
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
    userPayload: Partial<UserEntity>,
  ): Promise<boolean> {
    await this.findUserOrThrow(params.id)

    if (userPayload.password) {
      userPayload.password = await this.bcryptService.hash(userPayload.password)
    }

    if (userPayload.email) {
      const existingUser = await this.userRepository.getUserByEmail(
        userPayload.email,
      )
      if (existingUser && existingUser.id !== params.id) {
        throw this.exceptionsService.badRequestException({
          type: 'EmailAlreadyExistsException',
          message: 'Email already exists',
        })
      }
    }

    return await this.userRepository.updateUser(params, userPayload)
  }

  private async findUserOrThrow(userId: number): Promise<UserEntity> {
    const user = await this.userRepository.getUserById(userId)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }
    return user
  }
}
