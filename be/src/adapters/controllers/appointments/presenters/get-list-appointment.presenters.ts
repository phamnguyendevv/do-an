import { ApiProperty } from '@nestjs/swagger'

import {
  AppointmentEntity,
  AppointmentStatusEnum,
} from '@domain/entities/appointment.entity'
import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'

import { GetDetailProviderPresenter } from '@adapters/controllers/users/presenters/get-provider-detail-presenter'

export class GetListAppointmentPresenter {
  @ApiProperty()
  id!: number

  @ApiProperty()
  providerId!: number

  @ApiProperty()
  clientId!: number

  @ApiProperty()
  serviceId!: number

  @ApiProperty()
  notes!: string

  @ApiProperty()
  startTime!: Date

  @ApiProperty()
  endTime!: Date

  @ApiProperty()
  duration!: number

  @ApiProperty()
  discountAmount!: number

  @ApiProperty()
  cancellationReason?: string

  @ApiProperty()
  cancelledByUserId?: number
  @ApiProperty()
  cancelledAt?: Date
  @ApiProperty()
  commissionAmount!: number

  @ApiProperty()
  providerAmount!: number

  @ApiProperty()
  totalAmount!: number

  @ApiProperty({
    required: true,
    enum: UserRoleEnum,
    description: '1: Pending , 2: Confirmed, 3: Completed, 4: Cancelled',
  })
  status!: AppointmentStatusEnum

  @ApiProperty()
  reminderSentAt?: Date

  @ApiProperty()
  sendReminders?: boolean

  @ApiProperty()
  service!: {
    id: number
    name: string
    price: number
    duration?: number
    description?: string
    category?: {
      id: number
      name: string
      description?: string
    }
    reviewCount: number
    averageRating: number
    reviews?: {
      id: number
      rating: number
      comment: string
      createdAt: Date
    }[]
  }

  @ApiProperty()
  client!: {
    id: number
    username: string
  }

  provider!: GetDetailProviderPresenter

  constructor(partial: AppointmentEntity) {
    const serviceReviews = partial.service?.review || []
    const reviewCount = serviceReviews.length
    const averageRating =
      reviewCount > 0
        ? serviceReviews.reduce((sum, review) => sum + review.rating, 0) /
          reviewCount
        : 0

    this.id = partial.id
    this.notes = partial.notes
    this.startTime = partial.startTime
    this.endTime = partial.endTime
    this.duration = partial.duration
    this.discountAmount = partial.discountAmount
    this.cancellationReason = partial.cancellationReason
    this.cancelledByUserId = partial.cancelledByUserId
    this.cancelledAt = partial.cancelledAt
    this.commissionAmount = partial.commissionAmount
    this.providerAmount = partial.providerAmount
    this.totalAmount = partial.totalAmount
    this.status = partial.status
    this.reminderSentAt = partial.reminderSentAt
    this.service = {
      id: partial.service?.id ?? 0,
      name: partial.service?.name ?? '',
      price: partial.service?.price ?? 0,
      duration: partial.service?.duration,
      description: partial.service?.description ?? undefined,
      category: partial.service?.category
        ? {
            id: partial.service.category.id ?? 0,
            name: partial.service.category.name ?? '',
            description: partial.service.category.description ?? undefined,
          }
        : undefined,
      reviewCount: reviewCount ?? 0,
      averageRating:
        averageRating != null ? parseFloat(averageRating.toFixed(2)) : 0,
    }

    this.provider = {
      id: partial.provider?.id ?? 0,
      username: partial.provider?.username ?? '',
      email: partial.provider?.email ?? '',
      phone: partial.provider?.phone ?? '',
      avatarUrl: partial.provider?.avatarUrl ?? '',
      avatarPublicId: partial.provider?.avatarPublicId ?? '',
      businessName: partial.provider?.providerProfile?.businessName ?? '',
      status: partial.provider?.status ?? UserStatusEnum.InActive,
      role: partial.provider?.role ?? UserRoleEnum.Client,
      businessDescription:
        partial.provider?.providerProfile?.businessDescription ?? '',
      addressProvince: partial.provider?.addressProvince ?? '',
      addressDistrict: partial.provider?.addressDistrict ?? '',
      addressWard: partial.provider?.addressWard ?? '',
      addressDetail: partial.provider?.addressDetail ?? '',
      commissionRate: partial.provider?.providerProfile?.commissionRate ?? 0,
    }

    this.client = {
      id: partial.client?.id ?? 0,
      username: partial.client?.username ?? '',
    }
  }
}

export class Pagination {
  @ApiProperty({ example: 100 })
  total!: number

  @ApiProperty({ example: 2 })
  page!: number

  @ApiProperty({ example: 10 })
  size!: number
}

export class GetListAppointmentPresenters {
  @ApiProperty({ type: [GetListAppointmentPresenter] })
  data: GetListAppointmentPresenter[]

  @ApiProperty()
  pagination: Pagination

  constructor(data: AppointmentEntity[], pagination: Pagination) {
    this.data = data.map(
      (appointment) => new GetListAppointmentPresenter(appointment),
    )
    this.pagination = pagination
  }
}
