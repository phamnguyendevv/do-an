import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { GetNotificationsUseCase } from '@use-cases/notification/get-notifications.use-case'
import { GetUnreadCountUseCase } from '@use-cases/notification/get-unread-count.use-case'
import { MarkAllAsReadUseCase } from '@use-cases/notification/mark-all-as-read.use-case'
import { MarkAsReadUseCase } from '@use-cases/notification/mark-as-read.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { GetListNotificationDto } from './dto/get-list-notification.dto'
import {
  GetListNotificationPresenter,
  NotificationPresenter,
} from './presenters/get-list-pesenters'

@Controller('notifications')
@ApiTags('Notifications')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class NotificationController {
  constructor(
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
    private readonly markAsReadUseCase: MarkAsReadUseCase,
    private readonly markAllAsReadUseCase: MarkAllAsReadUseCase,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notifications',
    description: 'Retrieve a list of all notifications',
  })
  @ApiExtraModels(GetListNotificationPresenter)
  @ApiResponseType(GetListNotificationPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Notification' })
  async getNotifications(
    @Query() queryParams: GetListNotificationDto,
    @User('id') userId: number,
  ) {
    const { data, pagination } = await this.getNotificationsUseCase.execute({
      ...queryParams,
      userId,
    })

    return new GetListNotificationPresenter(data, pagination)
  }

  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get unread notifications count',
    description: 'Retrieve the count of all unread notifications',
  })
  @CheckPolicies({ action: 'read', subject: 'Notification' })
  async getUnreadCount(@User('id') userId: number) {
    return this.getUnreadCountUseCase.execute({ userId })
  }

  @Put(':id/read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiExtraModels(NotificationPresenter)
  @ApiResponseType(NotificationPresenter, false)
  @CheckPolicies({ action: 'update', subject: 'Notification' })
  async markAsRead(@Param('id') id: number, @User('id') userId: number) {
    const notification = await this.markAsReadUseCase.execute({
      notificationId: id,
      userId,
    })
    return new NotificationPresenter(notification)
  }

  @Put('read-all')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all notifications as read',
  })
  @CheckPolicies({ action: 'update', subject: 'Notification' })
  async markAllAsRead(@User('id') userId: number) {
    await this.markAllAsReadUseCase.execute({ userId })
    return { message: 'All notifications marked as read' }
  }
}
