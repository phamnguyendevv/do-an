import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'

import { Service } from './service.entity'
import { User } from './user.entity'

@Entity('favorite_services')
@Unique(['clientId', 'serviceId'])
export class FavoriteService {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_favorite_services_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'client_id' })
  public clientId!: number

  @Column({ type: 'int', name: 'service_id' })
  public serviceId!: number

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public readonly updatedAt!: Date

  // Relations
  @ManyToOne(() => User, (user) => user.favoriteServices)
  @JoinColumn({ name: 'client_id' })
  public client!: User

  @ManyToOne(() => Service, (service) => service.favorites)
  @JoinColumn({ name: 'service_id' })
  public service!: Service
}
