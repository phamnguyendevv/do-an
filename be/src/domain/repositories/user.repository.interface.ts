import { EntityManager } from 'typeorm'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'
import { UserEntity } from '@domain/entities/user.entity'

import { RegisterDto } from '@adapters/controllers/auth/dto/register.dto'

export interface ISearchUsersParams {
  id?: number
  status?: UserStatusEnum
  role?: UserRoleEnum
  size?: number
  page?: number
  search?: string
  emailVerified?: boolean
  isProvider?: boolean
}

export const USER_REPOSITORY = 'USER_REPOSITORY_INTERFACE'
export interface IUserRepositoryInterface {
  getUserByUsername(username: string): Promise<UserEntity | null>
  getUserByEmail(email: string): Promise<UserEntity | null>
  getUserById(id: number): Promise<UserEntity | null>
  updateLastLogin(id: number): Promise<void>
  createUser(user: RegisterDto, manager?: EntityManager): Promise<UserEntity>
  findUsers(
    queryParams: ISearchUsersParams,
  ): Promise<{ data: UserEntity[]; pagination: IPaginationParams }>
  findOnUser(params: { id: number }): Promise<UserEntity | null>
  findUser(filter: Partial<UserEntity>): Promise<UserEntity | null>
  updateUser(
    params: { id: number },
    userPayload: Partial<UserEntity>,
  ): Promise<boolean>
}
