import { Inject, Injectable } from '@nestjs/common'

import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'

@Injectable()
export class CheckUserExistenceUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
  ) {}

  async execute({
    email,
    username,
    phone,
  }: {
    email?: string
    username?: string
    phone?: string
  }) {
    const result = {
      emailExists: false,
      usernameExists: false,
      phoneExists: false,
    }

    if (email && email.trim()) {
      const u = await this.userRepository.getUserByEmail(email.trim())
      result.emailExists = !!u
    }

    if (username && username.trim()) {
      const u = await this.userRepository.getUserByUsername(username.trim())
      result.usernameExists = !!u
    }

    if (phone && phone.trim()) {
      const u = await this.userRepository.getUserByPhone(phone.trim())
      result.phoneExists = !!u
    }

    return result
  }
}
