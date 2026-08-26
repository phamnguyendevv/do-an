import { Inject, Injectable } from '@nestjs/common'

import {
  AppointmentEntity,
  AppointmentStatusEnum,
} from '@domain/entities/appointment.entity'
import { NotificationTypeEnum } from '@domain/entities/notification.entity'
import { PromotionEntity } from '@domain/entities/promotion.entity'
import { UserRoleEnum } from '@domain/entities/role.entity'
import { ServiceEntity } from '@domain/entities/service.entity'
import { UserEntity } from '@domain/entities/user.entity'
import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import {
  APPOINTMENT_REPOSITORY,
  IAppointmentRepositoryInterface,
} from '@domain/repositories/appointment.repository.interface'
import {
  IPromotionRepositoryInterface,
  PROMOTION_REPOSITORY,
} from '@domain/repositories/promotion.repository.interface'
import {
  IServiceRepositoryInterface,
  SERVICE_REPOSITORY,
} from '@domain/repositories/service.repository.interface'
import {
  IUserRepositoryInterface,
  USER_REPOSITORY,
} from '@domain/repositories/user.repository.interface'
import { MAILER_SERVICE } from '@domain/services/mailer.interface'

import { CreateNotificationUseCase } from '@use-cases/notification/create-notification.use-case'

import { NodeMailerService } from '@infrastructure/services/mailer/mailer.service'

const COMMISSION_AMOUNT = 10
const MAX_APPOINTMENT_DURATION_HOURS = 8
const MAX_FUTURE_BOOKING_YEARS = 1
const DUPLICATE_BOOKING_WINDOW_MINUTES = 5

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepositoryInterface,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepositoryInterface,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: IServiceRepositoryInterface,
    @Inject(PROMOTION_REPOSITORY)
    private readonly promotionRepository: IPromotionRepositoryInterface,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
    @Inject(MAILER_SERVICE)
    private readonly nodeMailerService: NodeMailerService,

    private readonly createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async execute(
    appointment: Partial<AppointmentEntity>,
    userId: number,
  ): Promise<AppointmentEntity> {
    this.checkIsSameUser(userId, appointment.providerId!)

    // await this.checkDuplicateBookingWindow(userId)

    const [provider, service] = await Promise.all([
      this.checkUserExists(appointment.providerId!, UserRoleEnum.Provider),
      this.checkServiceExists(appointment.serviceId!, appointment.providerId!),
    ])

    const { startTime, endTime } = this.prepareAppointmentTimes(
      appointment,
      service,
    )

    await this.checkSchedulingConflicts(
      appointment.providerId!,
      startTime,
      endTime,
    )

    if (appointment.promotionId) {
      await this.checkPromotionExists(appointment)
    }

    const completeAppointment = this.buildAppointmentEntity(
      appointment,
      service,
      userId,
      startTime,
      endTime,
    )

    const result = await this.createAppointmentWithNotification(
      completeAppointment,
      provider,
      service,
      startTime,
      endTime,
    )

    return result
  }
  private async checkUserExists(
    userId: number,
    userType: UserRoleEnum,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findUser({
      id: userId,
      role: userType,
    })

    if (!user) {
      throw this.exceptionsService.badRequestException({
        type: 'UserNotFoundException',
        message: `User with role ${UserRoleEnum[userType]} and ID ${userId} was not found.`,
      })
    }

    return user
  }

  private checkIsSameUser(clientId: number, providerId: number): void {
    if (clientId === providerId) {
      throw this.exceptionsService.badRequestException({
        type: 'SelfAppointmentException',
        message: 'Client and provider cannot be the same user',
      })
    }
  }

  private async checkServiceExists(
    serviceId: number,
    userId: number,
  ): Promise<ServiceEntity> {
    const service = await this.serviceRepository.findOnService({
      id: serviceId,
      userId: userId,
    })
    if (!service) {
      throw this.exceptionsService.notFoundException({
        type: 'ServiceNotFoundException',
        message: `Service with ID ${serviceId} for provider ${userId} not found`,
      })
    }

    return service
  }

  private async checkSchedulingConflicts(
    providerId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    const conflictingAppointments =
      await this.appointmentRepository.findAppointments({
        providerId,
        startTime,
        endTime,
        status: AppointmentStatusEnum.Confirmed,
      })

    if (conflictingAppointments?.data?.length > 0) {
      throw this.exceptionsService.badRequestException({
        type: 'AppointmentConflictException',
        message:
          'Provider already has an appointment scheduled during this time',
      })
    }
  }

  private async checkPromotionExists(
    appointment: Partial<AppointmentEntity>,
  ): Promise<void> {
    if (!appointment.promotionId) {
      return
    }
    const promotion = await this.promotionRepository.findOnePromotion({
      id: appointment.promotionId,
      userId: appointment.providerId!,
    })

    if (!promotion) {
      throw this.exceptionsService.notFoundException({
        type: 'PromotionNotFoundException',
        message: `Promotion not found`,
      })
    }

    const currentDate = new Date()
    const startDate = new Date(promotion.startDate)
    const endDate = new Date(promotion.endDate)

    if (startDate > currentDate) {
      throw this.exceptionsService.badRequestException({
        type: 'PromotionNotStartedException',
        message: 'Promotion has not started yet',
      })
    }

    if (endDate < currentDate) {
      throw this.exceptionsService.badRequestException({
        type: 'PromotionExpiredException',
        message: 'Promotion has expired',
      })
    }
    if (
      promotion.usageLimit <= 0 ||
      promotion.usedCount >= promotion.usageLimit
    ) {
      throw this.exceptionsService.badRequestException({
        type: 'PromotionUsageLimitException',
        message: 'Promotion usage limit reached',
      })
    }

    this.applyDiscountToAppointment(appointment, promotion)
  }

  private applyDiscountToAppointment(
    appointment: Partial<AppointmentEntity>,
    promotion: PromotionEntity,
  ): void {
    const originalAmount = appointment.totalAmount!
    let discountAmount = 0

    discountAmount = (originalAmount * promotion.discountValue) / 100

    if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
      discountAmount = promotion.maxDiscount
    }

    if (discountAmount > originalAmount) {
      discountAmount = originalAmount
    }

    appointment.discountAmount = discountAmount
    appointment.totalAmount = originalAmount - discountAmount
    if (appointment.totalAmount < 0) {
      appointment.totalAmount = 0
    }
  }

  private async checkDuplicateBookingWindow(clientId: number): Promise<void> {
    const windowStart = new Date(
      Date.now() -
        DUPLICATE_BOOKING_WINDOW_MINUTES * 60 * 1000 -
        7 * 60 * 60 * 1000,
    )

    const recentAppointments = await this.appointmentRepository.findAppointment(
      {
        clientId,
        createdAt: windowStart,
      },
    )

    if (recentAppointments?.length > 0) {
      throw this.exceptionsService.badRequestException({
        type: 'DuplicateAppointmentException',
        message: `You have already created an appointment within the last ${DUPLICATE_BOOKING_WINDOW_MINUTES} minutes`,
      })
    }
  }

  private prepareAppointmentTimes(
    appointment: Partial<AppointmentEntity>,
    service: ServiceEntity,
  ): { startTime: Date; endTime: Date } {
    const startTime = new Date(appointment.startTime!)
    const endTime = new Date(appointment.endTime!)

    this.validateAppointmentTime(startTime, endTime, service.duration)

    return { startTime, endTime }
  }

  private validateAppointmentTime(
    startTime: Date,
    endTime: Date,
    duration: number,
  ) {
    const now = new Date()
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(
      maxFutureDate.getFullYear() + MAX_FUTURE_BOOKING_YEARS,
    )

    if (duration <= 0) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidDurationException',
        message: 'Appointment duration must be greater than 0 minutes',
      })
    }

    if (duration > MAX_APPOINTMENT_DURATION_HOURS * 60) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidDurationException',
        message: `Appointment duration cannot exceed ${MAX_APPOINTMENT_DURATION_HOURS} hours`,
      })
    }

    if (isNaN(startTime.getTime())) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidStartTimeException',
        message: 'Invalid start time format',
      })
    }

    if (startTime < now) {
      throw this.exceptionsService.badRequestException({
        type: 'AppointmentInPastException',
        message: 'Appointment start time cannot be in the past',
      })
    }

    if (startTime > maxFutureDate) {
      throw this.exceptionsService.badRequestException({
        type: 'AppointmentTooFarInFutureException',
        message: `Appointment cannot be scheduled more than ${MAX_FUTURE_BOOKING_YEARS} year(s) in advance`,
      })
    }

    if (startTime >= endTime) {
      throw this.exceptionsService.badRequestException({
        type: 'InvalidAppointmentTimeException',
        message: 'Start time must be before end time',
      })
    }
  }

  private buildAppointmentEntity(
    appointment: Partial<AppointmentEntity>,
    service: ServiceEntity,
    userId: number,
    startTime: Date,
    endTime: Date,
  ): AppointmentEntity {
    const totalAmount = service.price * appointment.duration!
    const commissionAmount = (totalAmount * COMMISSION_AMOUNT) / 100
    const providerAmount = totalAmount - commissionAmount
    return {
      ...appointment,
      clientId: userId,
      status: AppointmentStatusEnum.Pending,
      cancellationReason: '',
      notes: appointment.notes || '',
      startTime,
      endTime,
      duration: appointment.duration!,
      totalAmount,
      finalAmount: totalAmount - (appointment.discountAmount || 0),
      commissionAmount,
      providerAmount,
      discountAmount: appointment.discountAmount || 0,
    } as AppointmentEntity
  }

  private async createAppointmentWithNotification(
    appointment: AppointmentEntity,
    provider: UserEntity,
    service: ServiceEntity,
    startTime: Date,
    endTime: Date,
  ): Promise<AppointmentEntity> {
    const result =
      await this.appointmentRepository.createAppointment(appointment)

    if (!result) {
      throw this.exceptionsService.badRequestException({
        type: 'BadRequest',
        message: 'Failed to create appointment',
      })
    }

    // this.sendAppointmentNotification(
    //   provider,
    //   service,
    //   startTime,
    //   endTime,
    //   appointment.duration,
    // ).catch(() => {
    //   throw this.exceptionsService.internalServerErrorException({
    //     type: 'NotificationError',
    //     message: `Failed to send appointment notification`,
    //   })
    // })

    // this.createNotificationUseCase
    //   .execute({
    //     receiverId: provider.id,
    //     title: 'New Appointment Created',
    //     message: `You have a new appointment`,
    //     type: NotificationTypeEnum.AppointmentCreated,
    //     data: { appointmentId: result.id },
    //   })
    //   .catch(() => {
    //     throw this.exceptionsService.internalServerErrorException({
    //       type: 'NotificationError',
    //       message: `Failed to send appointment notification`,
    //     })
    //   })

    return result
  }

  private async sendAppointmentNotification(
    provider: UserEntity,
    service: ServiceEntity,
    startTime: Date,
    endTime: Date,
    duration: number,
  ): Promise<void> {
    const emailContent = `
      A new appointment has been created with the following details:
      
      Client name: ${provider.username}
      Service: ${service.name}
      Start Time: ${startTime.toISOString()}
      End Time: ${endTime.toISOString()}
      Duration: ${duration} minutes
      
      Please check the system for more details.
    `

    await this.nodeMailerService.sendMail(
      provider.email,
      'New Appointment Created',
      emailContent.trim(),
    )
  }
}
