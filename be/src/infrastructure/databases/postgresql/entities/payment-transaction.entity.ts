import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { BookstoreOrder } from './bookstore-order.entity'

/**
 * Bảng ghi vết giao dịch thanh toán (SePay Webhook).
 * Mục đích chính: Idempotency — ngăn xử lý webhook trùng lặp.
 * Mỗi giao dịch được xác định duy nhất bởi reference_code.
 */
@Entity('payment_transactions')
@Index('IDX_payment_transactions_reference_code', ['referenceCode'], {
  unique: true,
})
@Index('IDX_payment_transactions_order_id', ['orderId'])
@Index('IDX_payment_transactions_created_at', ['createdAt'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    primaryKeyConstraintName: 'PK_payment_transactions_id',
  })
  public readonly id!: number

  /**
   * Mã tham chiếu giao dịch từ SePay/Ngân hàng.
   * Unique constraint để đảm bảo idempotency.
   */
  @Column({
    type: 'varchar',
    length: 255,
    name: 'reference_code',
    unique: true,
  })
  public referenceCode!: string

  /** Cổng thanh toán (vd: MBBank, VietcomBank, SePay) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  public gateway?: string

  /** Số tài khoản nhận tiền */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'account_number',
  })
  public accountNumber?: string

  /** Số tiền chuyển khoản */
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    name: 'transfer_amount',
  })
  public transferAmount!: number

  /** Mã đơn hàng trích xuất từ nội dung chuyển khoản */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'order_code' })
  public orderCode?: string

  /** ID đơn hàng được ghép (nếu tìm thấy) */
  @Column({ type: 'bigint', nullable: true, name: 'order_id' })
  public orderId?: number

  @ManyToOne(() => BookstoreOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  public order?: BookstoreOrder

  /** Nội dung chuyển khoản gốc */
  @Column({ type: 'text', nullable: true })
  public content?: string

  /**
   * Trạng thái xử lý webhook:
   * - SUCCESS: Tìm thấy đơn hàng và cập nhật thành công
   * - AUTO_CREATED: Tự động tạo đơn hàng mới
   * - NOT_FOUND: Không tìm thấy đơn hàng khớp
   * - DUPLICATE: Webhook bị xử lý trùng lặp (idempotency check)
   * - IGNORED: Giao dịch chuyển tiền đi (transferType != in)
   */
  @Column({ type: 'varchar', length: 50, default: 'SUCCESS' })
  public status!:
    | 'SUCCESS'
    | 'AUTO_CREATED'
    | 'NOT_FOUND'
    | 'DUPLICATE'
    | 'IGNORED'

  /** Raw payload từ SePay để debug */
  @Column({ type: 'jsonb', nullable: true, name: 'raw_payload' })
  public rawPayload?: Record<string, unknown>

  /** Thời điểm webhook được xử lý */
  @Column({
    type: 'timestamp',
    name: 'processed_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  public processedAt!: Date

  @CreateDateColumn({ name: 'created_at' })
  public readonly createdAt!: Date
}
