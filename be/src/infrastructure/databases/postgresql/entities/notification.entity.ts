import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm'

@Entity('notifications')
@Index('IDX_notifications_actor_created_at', ['actorId', 'createdAt'])
@Index('IDX_notifications_actor_read', ['actorId', 'read'])
export class Notification {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    primaryKeyConstraintName: 'PK_notifications_id_actor_id',
  })
  id!: string

  @PrimaryColumn({
    type: 'bigint',
    name: 'actor_id',
    primaryKeyConstraintName: 'PK_notifications_id_actor_id',
  })
  actorId!: number

  @Column({ type: 'varchar', length: 160 })
  title!: string

  @Column({ type: 'text' })
  description!: string

  @Column({ type: 'varchar', length: 80 })
  module!: string

  @Column({ type: 'varchar', length: 16, default: 'info' })
  tone!: string

  @Column({ type: 'boolean', default: false })
  read!: boolean

  @Column({ type: 'varchar', length: 255, nullable: true })
  route?: string

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date
}
