import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

import { Repository } from 'typeorm'

import { AppointmentEntity } from '@domain/entities/appointment.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IAppointmentRepositoryInterface,
  ISearchAppointmentsParams,
} from '@domain/repositories/appointment.repository.interface'

import { GetDetailAppointmentPresenter } from '@adapters/controllers/appointments/presenters/get-detail-appointment.presenters'
import { GetListAppointmentPresenter } from '@adapters/controllers/appointments/presenters/get-list-appointment.presenters'

import { Appointment } from '../entities/appointment.entity'

@Injectable()
export class AppointmentRepository implements IAppointmentRepositoryInterface {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  async getAppointmentById(
    id: number,
  ): Promise<GetDetailAppointmentPresenter | null> {
    const appointment = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('service.reviews', 'serviceReviews')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('appointment.provider', 'provider')
      .where('appointment.id = :id', { id })
      .andWhere('appointment.isDeleted = :isDeleted', {
        isDeleted: false,
      })
      .getOne()

    if (!appointment) return null

    return new GetDetailAppointmentPresenter(appointment)
  }

  createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    const newAppointment = this.appointmentRepository.create(appointment)
    return this.appointmentRepository.save(newAppointment)
  }

  async updateAppointment(
    id: number,
    appointment: Partial<Appointment>,
  ): Promise<boolean> {
    const updatedAppointment = await this.appointmentRepository.update(
      { id },
      appointment,
    )
    if (updatedAppointment.affected === 0) return false
    return true
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const deleteAppointment = await this.appointmentRepository.update(
      { id },
      { isDeleted: true },
    )
    if (deleteAppointment.affected === 0) return false
    return true
  }

  async findAppointment(
    queryParams: ISearchAppointmentsParams,
  ): Promise<Appointment[]> {
    const queryBuilder =
      this.appointmentRepository.createQueryBuilder('appointment')
    if (queryParams.id) {
      queryBuilder.andWhere('appointment.id = :id', {
        id: queryParams.id,
      })
    }
    if (queryParams.clientId) {
      queryBuilder.andWhere('appointment.clientId = :clientId', {
        clientId: queryParams.clientId,
      })
    }

    if (queryParams.providerId) {
      queryBuilder.andWhere('appointment.providerId = :providerId', {
        providerId: queryParams.providerId,
      })
    }

    if (queryParams.serviceId) {
      queryBuilder.andWhere('appointment.serviceId = :serviceId', {
        serviceId: queryParams.serviceId,
      })
    }

    if (queryParams.status) {
      queryBuilder.andWhere('appointment.status IN (:...status)', {
        status: queryParams.status,
      })
    }
    if (queryParams.createdAt) {
      queryBuilder.andWhere('appointment.createdAt >= :createdAt', {
        createdAt: queryParams.createdAt,
      })
    }

    const data = await queryBuilder.getMany()

    return data
  }

  async findAppointments(
    queryParams: ISearchAppointmentsParams,
  ): Promise<{ data: AppointmentEntity[]; pagination: IPaginationParams }> {
    queryParams.page = queryParams.page || 1
    queryParams.size = queryParams.size || 100
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('service.reviews', 'serviceReviews')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('appointment.provider', 'provider')
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('provider.providerProfile', 'providerProfile')
    if (queryParams.search) {
      queryBuilder.andWhere(
        'provider.username ILIKE :search OR service.name ILIKE :search',
        {
          search: `%${queryParams.search}%`,
        },
      )
    }
    if (queryParams.id) {
      queryBuilder.andWhere('appointment.id = :id', {
        id: queryParams.id,
      })
    }

    if (queryParams.clientId) {
      queryBuilder.andWhere('appointment.clientId = :clientId', {
        clientId: queryParams.clientId,
      })
    }

    if (queryParams.providerId) {
      queryBuilder.andWhere('appointment.providerId = :providerId', {
        providerId: queryParams.providerId,
      })
    }

    if (queryParams.serviceId) {
      queryBuilder.andWhere('appointment.serviceId = :serviceId', {
        serviceId: queryParams.serviceId,
      })
    }

    if (queryParams.status) {
      queryBuilder.andWhere('appointment.status = :status', {
        status: queryParams.status,
      })
    }

    if (queryParams.createdAt) {
      queryBuilder.andWhere('appointment.createdAt >= :createdAt', {
        createdAt: queryParams.createdAt,
      })
    }

    if (queryParams.startTime && queryParams.endTime) {
      queryBuilder.andWhere('appointment.startTime >= :startTime', {
        startTime: queryParams.startTime,
      })
      queryBuilder.andWhere('appointment.endTime <= :endTime', {
        endTime: queryParams.endTime,
      })
    }
    const pageIndex = Math.max(queryParams.page - 1, 0)
    queryBuilder.skip(pageIndex * queryParams.size)
    queryBuilder.take(queryParams.size)

    const [data, total] = await queryBuilder.getManyAndCount()

    const pagination: IPaginationParams = {
      total,
      page: queryParams.page,
      size: queryParams.size,
    }

    return { data, pagination }
  }
}
