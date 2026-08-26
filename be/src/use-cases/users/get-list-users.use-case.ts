import { Inject, Injectable } from '@nestjs/common'

import { IPaginationParams } from '@domain/entities/search.entity'
import { UserEntity } from '@domain/entities/user.entity'
import {
  ISearchUsersParams,
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'

@Injectable()
export class GetListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
  ) {}

  async execute(
    queryParams: ISearchUsersParams,
  ): Promise<{ data: UserEntity[]; pagination: IPaginationParams }> {
    return await this.userRepository.findUsers(queryParams)
  }
}
