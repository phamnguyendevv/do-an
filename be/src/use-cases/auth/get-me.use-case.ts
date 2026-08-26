import { Inject, Injectable } from '@nestjs/common'

import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
  ) {}

  async execute(payload: { userId: number }) {
    const user = await this.userRepository.getUserById(payload.userId)
    if (!user) {
      throw new Error('User not found')
    }
    const { password, ...rest } = user

    return rest
  }
}
