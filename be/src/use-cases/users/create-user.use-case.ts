import { Inject, Injectable } from '@nestjs/common'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'
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
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(BCRYPT_SERVICE)
    private readonly bcryptService: IBcryptService,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(dto: {
    username: string
    email: string
    password?: string
    role?: UserRoleEnum
    phone?: string
    status?: UserStatusEnum
  }): Promise<UserEntity> {
    const existing = await this.userRepository.getUserByEmail(dto.email)
    if (existing) {
      throw this.exceptionsService.badRequestException({
        type: 'EmailAlreadyExistsException',
        message: `Email ${dto.email} đã tồn tại trong hệ thống`,
      })
    }

    const rawPassword = dto.password || 'password123'
    const hashedPassword = await this.bcryptService.hash(rawPassword)

    const user = await this.userRepository.createUser({
      username: dto.username || dto.email.split('@')[0],
      email: dto.email,
      password: hashedPassword,
      role: dto.role ?? UserRoleEnum.Staff,
      status: dto.status ?? UserStatusEnum.Active,
      phone: dto.phone,
      emailVerified: true,
    })

    return user
  }
}
