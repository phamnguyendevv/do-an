import { IsNumber } from 'class-validator'

export class DeleteNotificationSocketDto {
  @IsNumber()
  notificationId!: number
}
