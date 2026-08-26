import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { MessageTypeEnum } from '@domain/entities/chat-messgae.entity'

import { ChatConversation } from './chat-conversation.entity'
import { User } from './user.entity'

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_chat_messages_id',
  })
  public readonly id!: number
  @Column({ type: 'int', name: 'conversation_id' })
  public conversationId!: number

  @Column({ type: 'int', name: 'sender_id' })
  public senderId!: number

  @Column({ type: 'text' })
  public message!: string

  @Column({
    type: 'enum',
    enum: MessageTypeEnum,
    default: MessageTypeEnum.Text,
    name: 'message_type',
  })
  public messageType!: MessageTypeEnum

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'attachment_url',
  })
  public attachmentUrl!: string

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  public isRead!: boolean

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  public readAt!: Date

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date

  // Relations
  @ManyToOne(() => ChatConversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  public conversation!: ChatConversation

  @ManyToOne(() => User, (user) => user.sentMessages)
  @JoinColumn({ name: 'sender_id' })
  public sender!: User
}
