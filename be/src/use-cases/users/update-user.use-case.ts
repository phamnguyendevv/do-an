import { Inject, Injectable } from '@nestjs/common'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { ProviderStatusEnum } from '@domain/entities/status.entity'
import { UserEntity } from '@domain/entities/user.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IProviderProfileRepositoryInterface,
  PROVIDER_PROFILE_REPOSITORY,
} from '@domain/repositories/provider-profile.respository.interface'
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
    @Inject(PROVIDER_PROFILE_REPOSITORY)
    private readonly providerProfileRepository: IProviderProfileRepositoryInterface,
  ) {}

  async execute(
    params: { id: number },
    userPayload: Partial<UserEntity>,
  ): Promise<boolean> {
    const user = await this.findUserOrThrow(params.id)

    this.validateRoleChange(user.role, userPayload.role)

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
    await this.userRepository.updateUser(params, userPayload)
    await this.handleRoleChangeEffects(user, params.id, userPayload.role)

    return true
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

  private validateRoleChange(
    currentRole?: UserRoleEnum,
    newRole?: UserRoleEnum,
  ): void {
    if (!newRole || currentRole === newRole) return

    // Check if trying to change provider to provider (redundant check)
    if (
      currentRole === UserRoleEnum.Provider &&
      newRole === UserRoleEnum.Provider
    ) {
      throw this.exceptionsService.badRequestException({
        type: 'UserAlreadyProviderException',
        message: 'User is already a provider',
      })
    }

    // Check if trying to change admin to provider (not allowed)
    if (
      currentRole === UserRoleEnum.Admin &&
      newRole === UserRoleEnum.Provider
    ) {
      throw this.exceptionsService.badRequestException({
        type: 'UserIsAdminException',
        message: 'User is an admin, cannot be updated to provider',
      })
    }

    // Additional validation: Check if trying to change provider to client
    if (
      currentRole === UserRoleEnum.Provider &&
      newRole === UserRoleEnum.Client
    ) {
      throw this.exceptionsService.badRequestException({
        type: 'ProviderToClientNotAllowedException',
        message: 'Cannot change provider back to client role',
      })
    }
  }

  private async handleRoleChangeEffects(
    user: UserEntity,
    userId: number,
    newRole?: UserRoleEnum,
  ): Promise<void> {
    if (
      user.role === UserRoleEnum.Client &&
      newRole === UserRoleEnum.Provider
    ) {
      await this.createProviderProfile(userId)
    }
  }

  private async createProviderProfile(userId: number): Promise<void> {
    try {
      await this.providerProfileRepository.createProvider({
        userId,
        businessName: '',
        commissionRate: 0,
        bankAccountInfo: {},
        businessDescription: '',
        status: ProviderStatusEnum.Pending,
      })
    } catch (error) {
      throw this.exceptionsService.badRequestException({
        type: 'BadRequest',
        message: 'Failed to create provider profile',
      })
    }
  }
}
