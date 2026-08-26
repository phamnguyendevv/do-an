import { Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { NotificationEntity } from '@domain/entities/notification.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  INotificationRepositoryInterface,
  ISearchNotificationParams,
} from '@domain/repositories/notification.repository.interface'

import { Notification } from '../entities/notification.entity'

@Injectable()
export class NotificationRepository
  implements INotificationRepositoryInterface
{
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,

    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async createNotification(
    notification: Partial<NotificationEntity>,
  ): Promise<NotificationEntity> {
    const entity = this.repository.create(notification)
    const savedEntity = await this.repository.save(entity)
    return savedEntity
  }
  async findNotificationsByUserId(params: ISearchNotificationParams): Promise<{
    data: NotificationEntity[]
    pagination: IPaginationParams
  }> {
    const page = params.page || 1
    const size = params.size || 100
    const queryBuilder = this.repository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.sender', 'sender')
      .leftJoinAndSelect('notification.receiver', 'receiver')
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)

    const [data, total] = await queryBuilder.getManyAndCount()

    return {
      data,
      pagination: {
        total,
        page,
        size,
      },
    }
  }
  async findNotificationById(id: number): Promise<NotificationEntity | null> {
    const entity = await this.repository.findOne({ where: { id } })
    return entity ? entity : null
  }

  async findNotificationByUserIdAndId(
    userId: number,
    id: number,
  ): Promise<NotificationEntity | null> {
    const entity = await this.repository.findOne({
      where: { id, receiverId: userId },
    })
    return entity ? entity : null
  }

  async markNotificationAsRead(
    id: number,
    userId: number,
  ): Promise<NotificationEntity> {
    await this.repository.update(
      { id, receiverId: userId },
      {
        isRead: true,
        readAt: new Date(),
      },
    )
    const updatedNotification = await this.repository.findOne({
      where: { id, receiverId: userId },
    })

    if (!updatedNotification) {
      throw this.exceptionsService.notFoundException({
        type: 'NotificationNotFoundException',
        message: `Notification not found`,
      })
    }
    return updatedNotification
  }

  async deleteNotification(id: number): Promise<boolean> {
    const isDeleted = await this.repository.update({ id }, { isDeleted: true })

    if (isDeleted.affected === 0) return false

    return true
  }

  async getNotificationUnreadCount(userId: number): Promise<number> {
    const count = await this.repository.count({
      where: { receiverId: userId, isRead: false },
    })
    return count
  }

  async markAllNotificationAsRead(userId: number): Promise<void> {
    await this.repository.update(
      { receiverId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    )
  }
}
