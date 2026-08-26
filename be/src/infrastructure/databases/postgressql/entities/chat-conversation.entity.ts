import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'

import { ChatMessage } from './chat-mesage.entity'
import { User } from './user.entity'

@Entity('chat_conversations')
@Unique(['clientId', 'providerId'])
export class ChatConversation {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_chat_conversations_id',
  })
  public readonly id!: number

  @Column({ type: 'int', name: 'client_id' })
  public clientId!: number

  @Column({ type: 'int', name: 'provider_id' })
  public providerId!: number

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'last_message_at',
  })
  public lastMessageAt!: Date

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  // Relations
  @ManyToOne(() => User, (user) => user.clientConversations)
  @JoinColumn({ name: 'client_id' })
  public client!: User

  @ManyToOne(() => User, (user) => user.providerConversations)
  @JoinColumn({ name: 'provider_id' })
  public provider!: User

  @OneToMany(() => ChatMessage, (message) => message.conversation)
  public messages!: ChatMessage[]
}
