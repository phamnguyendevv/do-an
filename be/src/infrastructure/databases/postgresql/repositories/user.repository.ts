import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { EntityManager, Repository } from 'typeorm'

import { IPaginationParams } from '@domain/entities/search.entity'
import { UserEntity } from '@domain/entities/user.entity'
import {
  ISearchUsersParams,
  IUserRepositoryInterface,
} from '@domain/repositories/user.repository.interface'

import { RegisterDto } from '@adapters/controllers/auth/dto/register.dto'

import { User } from '../entities/user.entity'

const DEFAULT_SELECT_FIELDS: (keyof User)[] = [
  'id',
  'username',
  'status',
  'role',
  'email',
  'lastLogin',
  'emailVerified',
  'phone',
  'avatarUrl',
  'avatarPublicId',
  'addressProvince',
  'addressDistrict',
  'addressWard',
  'addressDetail',
  'createdAt',
  'updatedAt',
]

@Injectable()
export class UserRepository implements IUserRepositoryInterface {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserByUsername(username: string) {
    return await this.userRepository.findOne({
      where: {
        username,
      },
    })
  }

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: {
        email,
      },
    })
  }

  async getUserById(id: number) {
    return await this.userRepository.findOne({
      where: {
        id,
      },
    })
  }

  async updateLastLogin(id: number) {
    await this.userRepository.update(
      {
        id,
      },
      { lastLogin: () => 'CURRENT_TIMESTAMP' },
    )
  }

  async createUser(user: RegisterDto, manager?: EntityManager): Promise<User> {
    const repository: Repository<User> = manager
      ? manager.getRepository(User)
      : this.userRepository

    const newUser = repository.create(user)
    return await repository.save(newUser)
  }

  async findUsers({
    id,
    status,
    role,
    size,
    page,
    search,
  }: ISearchUsersParams): Promise<{
    data: UserEntity[]
    pagination: IPaginationParams
  }> {
    size = size || 100
    page = page || 1
    const queryBuilder = this.userRepository.createQueryBuilder('user')

    queryBuilder.select(DEFAULT_SELECT_FIELDS.map((field) => `user.${field}`))

    if (id !== undefined) {
      queryBuilder.andWhere('user.id = :id', { id })
    }

    if (status !== undefined) {
      queryBuilder.andWhere('user.status = :status', { status })
    }

    if (role !== undefined) {
      queryBuilder.andWhere('user.role = :role', { role })
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` },
      )
    }

    const pageIndex = Math.max(page - 1, 0)
    queryBuilder.skip(pageIndex * size).take(size)
    queryBuilder.orderBy('user.id', 'ASC')
    const [data, total] = await queryBuilder.getManyAndCount()
    const pagination: IPaginationParams = {
      total,
      page: pageIndex + 1,
      size,
    }
    return { data, pagination }
  }

  async findUser(filter: Partial<UserEntity>): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: filter,
    })
  }

  async findOnUser({ id }: { id: number }): Promise<UserEntity | null> {
    return await this.userRepository.findOne({
      where: {
        id,
      },
    })
  }

  async updateUser(
    { id }: { id: number },
    userPayload: Partial<UserEntity>,
  ): Promise<boolean> {
    const result = await this.userRepository.update(id, userPayload)
    return (result.affected ?? 0) > 0
  }
}
