import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator'

import { NotificationTypeEnum } from '@domain/entities/notification.entity'

export class CreateNotificationDto {
  @IsString()
  title!: string

  @IsString()
  message!: string

  @IsEnum(NotificationTypeEnum)
  type!: NotificationTypeEnum

  @IsOptional()
  @IsObject()
  data?: object
}
