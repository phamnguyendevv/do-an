import { Inject, Injectable } from '@nestjs/common'

import { IPaginationParams } from '@domain/entities/search.entity'
import { UserEntity } from '@domain/entities/user.entity'
import {
  IProviderProfileRepositoryInterface,
  ISearchProviderParams,
  PROVIDER_PROFILE_REPOSITORY,
} from '@domain/repositories/provider-profile.respository.interface'

@Injectable()
export class GetListProviderUseCase {
  constructor(
    @Inject(PROVIDER_PROFILE_REPOSITORY)
    private readonly providerProfileRepository: IProviderProfileRepositoryInterface,
  ) {}

  async execute(
    queryParams: ISearchProviderParams,
  ): Promise<{ data: UserEntity[]; pagination: IPaginationParams }> {
    const user = await this.providerProfileRepository.findProviders(queryParams)
    return user
  }
}
