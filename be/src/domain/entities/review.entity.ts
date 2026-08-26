import { ServiceEntity } from './service.entity'
import { UserEntity } from './user.entity'

export class ReviewEntity {
  public readonly id!: number
  public clientId!: number
  public providerId!: number
  public serviceId!: number
  public rating!: number
  public comment?: string
  public user?: UserEntity
  public isDeleted!: boolean
  public provider?: UserEntity
  public client?: UserEntity
  public service?: ServiceEntity
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}
