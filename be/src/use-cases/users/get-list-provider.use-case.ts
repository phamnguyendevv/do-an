import { Inject, Injectable } from '@nestjs/common'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { UserEntity } from '@domain/entities/user.entity'
import {
  ISearchUsersParams,
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'

@Injectable()
export class GetListProviderUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
  ) {}

  async execute(
    queryParams: ISearchUsersParams,
  ): Promise<{ data: UserEntity[]; pagination: IPaginationParams }> {
    queryParams.role = UserRoleEnum.Provider
    return await this.userRepository.findUsers(queryParams)
  }
}
