import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('activity_logs')
@Index('IDX_activity_logs_created_at', ['createdAt'])
@Index('IDX_activity_logs_actor_id', ['actorId'])
export class ActivityLog {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_activity_logs_id',
  })
  public readonly id!: number

  @Column({ type: 'bigint', nullable: true, name: 'actor_id' })
  public actorId?: number

  @Column({ type: 'varchar', length: 255, name: 'actor_name' })
  public actorName!: string

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'actor_role' })
  public actorRole?: string

  @Column({ type: 'varchar', length: 50 })
  public action!: string

  @Column({ type: 'varchar', length: 100, name: 'resource_type' })
  public resourceType!: string

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'resource_id' })
  public resourceId?: string

  @Column({ type: 'text', nullable: true })
  public description?: string

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  public metadata?: Record<string, unknown>

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_address' })
  public ipAddress?: string

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date
}
