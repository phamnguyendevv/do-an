import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'
import { UserEntity } from '@domain/entities/user.entity'

import { PaymentGateway } from '@adapters/gateways/payment/payment.gateway'

import { Notification } from '@infrastructure/databases/postgresql/entities/notification.entity'
import { User as UserRecord } from '@infrastructure/databases/postgresql/entities/user.entity'

import { User as CurrentUser } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import {
  CreateNotificationDto,
  ListNotificationsDto,
} from './dto/notifications.dto'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    @InjectRepository(UserRecord)
    private readonly userRepository: Repository<UserRecord>,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  @Get()
  async list(
    @CurrentUser('id') actorId: UserEntity['id'],
    @Query() query: ListNotificationsDto,
  ) {
    const builder = this.repository
      .createQueryBuilder('notification')
      .where('notification.actor_id = :actorId', { actorId })
      .orderBy('notification.created_at', 'DESC')
      .take(query.size)
      .skip((query.page - 1) * query.size)
    if (query.module)
      builder.andWhere('notification.module = :module', {
        module: query.module,
      })
    if (query.tone)
      builder.andWhere('notification.tone = :tone', { tone: query.tone })
    if (query.read !== undefined)
      builder.andWhere('notification.read = :read', { read: query.read })
    if (query.from)
      builder.andWhere('notification.created_at >= :from', {
        from: new Date(query.from),
      })
    if (query.to)
      builder.andWhere('notification.created_at <= :to', {
        to: new Date(query.to),
      })

    const [data, total] = await builder.getManyAndCount()
    const unreadCount = await this.repository.count({
      where: { actorId, read: false },
    })
    return {
      data,
      pagination: { total, page: query.page, size: query.size },
      unreadCount,
    }
  }

  @Post()
  async create(
    @CurrentUser('id') actorId: UserEntity['id'],
    @CurrentUser('role') actorRole: UserRoleEnum,
    @Body() input: CreateNotificationDto,
  ) {
    const recipients =
      actorRole === UserRoleEnum.Admin
        ? await this.userRepository.find({
            select: { id: true },
            where: { status: UserStatusEnum.Active },
          })
        : [{ id: actorId } as UserRecord]
    const existing = await this.repository.find({
      where: recipients.map(({ id }) => ({ id: input.id, actorId: id })),
    })
    const existingUserIds = new Set(
      existing.map((notification) => Number(notification.actorId)),
    )
    const newNotifications = recipients
      .filter((user) => !existingUserIds.has(user.id))
      .map((user) =>
        this.repository.create({
          ...input,
          actorId: user.id,
          route:
            input.route?.startsWith('/') && !input.route.startsWith('//')
              ? input.route
              : undefined,
        }),
      )
    const savedNew = newNotifications.length
      ? await this.repository.save(newNotifications)
      : []
    for (const notification of savedNew) {
      this.paymentGateway.emitNotification(
        Number(notification.actorId),
        notification,
      )
    }
    const saved = [...existing, ...savedNew]
    return saved.find(
      (notification) => Number(notification.actorId) === Number(actorId),
    )
  }

  @Patch(':id/read')
  async markRead(
    @CurrentUser('id') actorId: UserEntity['id'],
    @Param('id') id: string,
  ) {
    const result = await this.repository.update({ id, actorId }, { read: true })
    if (result.affected)
      this.paymentGateway.emitNotificationRead(Number(actorId), id)
    return { id, read: true }
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser('id') actorId: UserEntity['id']) {
    const result = await this.repository.update(
      { actorId, read: false },
      { read: true },
    )
    if (result.affected)
      this.paymentGateway.emitNotificationsReadAll(Number(actorId))
    return { updated: result.affected ?? 0 }
  }

  @Delete(':id')
  async remove(
    @CurrentUser('id') actorId: UserEntity['id'],
    @Param('id') id: string,
  ) {
    const result = await this.repository.delete({ id, actorId })
    if (result.affected)
      this.paymentGateway.emitNotificationDeleted(Number(actorId), id)
    return { id, deleted: result.affected ?? 0 }
  }

  @Delete()
  async clear(@CurrentUser('id') actorId: UserEntity['id']) {
    const result = await this.repository.delete({ actorId })
    if (result.affected)
      this.paymentGateway.emitNotificationsCleared(Number(actorId))
    return { deleted: result.affected ?? 0 }
  }
}
