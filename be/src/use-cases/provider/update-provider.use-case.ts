import { Inject, Injectable } from '@nestjs/common'

import { ProviderProfileEntity } from '@domain/entities/provider-profile.entity'
import { ProviderStatusEnum } from '@domain/entities/status.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  IProviderProfileRepositoryInterface,
  PROVIDER_PROFILE_REPOSITORY,
} from '@domain/repositories/provider-profile.respository.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'

@Injectable()
export class UpdateProviderUseCase {
  constructor(
    @Inject(PROVIDER_PROFILE_REPOSITORY)
    private readonly providerProfileRepository: IProviderProfileRepositoryInterface,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,

    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async execute(userId: number, status: ProviderStatusEnum): Promise<boolean> {
    await this.checkUserExistence(userId)

    const updateProvider = await this.providerProfileRepository.updateProvider(
      userId,
      { status },
    )
    if (!updateProvider) {
      throw this.exceptionsService.badRequestException({
        type: 'BadRequest',
        message: 'Failed to update provider profile',
      })
    }
    return true
  }
  private async checkUserExistence(id: number): Promise<void> {
    const user = await this.userRepository.getUserById(id)
    if (!user) {
      throw this.exceptionsService.notFoundException({
        type: 'UserNotFoundException',
        message: 'User not found',
      })
    }
    //   const providerProfile = await this.providerProfileRepository.findProviders({
    //     status: ProviderStatusEnum.Active,
    //   })
    //   if (providerProfile.data.length > 0) {
    //     throw this.exceptionsService.badRequestException({
    //       type: 'BadRequest',
    //       message: 'Provider profile already exists for this user',
    //     })
    //   }
  }
}
