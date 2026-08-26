import { IsNumber, IsOptional } from 'class-validator'

export class GetNotificationsSocketDto {
  @IsOptional()
  @IsNumber()
  page?: number

  @IsOptional()
  @IsNumber()
  size?: number
}

export class MarkAsReadSocketDto {
  @IsNumber()
  notificationId!: number
}

export class DeleteNotificationSocketDto {
  @IsNumber()
  notificationId!: number
}
