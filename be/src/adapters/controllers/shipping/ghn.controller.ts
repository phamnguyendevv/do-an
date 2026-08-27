import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { DataSource } from 'typeorm'

import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { OrderHistory } from '@infrastructure/databases/postgresql/entities/order-history.entity'
import { StockMovement } from '@infrastructure/databases/postgresql/entities/stock-movement.entity'
import { GhnService } from '@infrastructure/services/ghn/ghn.service'
import {
  CalculateFeeDto,
  CreateGhnOrderDto,
  LeadTimeDto,
  PrintTokenDto,
  UpdateGhnOrderDto,
} from './dto/ghn-shipping.dto'

const GHN_STATUS_MAP: Record<string, string> = {
  ready_to_pick: 'PREPARING',
  picking: 'PREPARING',
  money_collect_picking: 'PREPARING',
  picked: 'PREPARING',
  storing: 'SHIPPING',
  transporting: 'SHIPPING',
  sorting: 'SHIPPING',
  delivering: 'SHIPPING',
  money_collect_delivering: 'SHIPPING',
  delivered: 'DELIVERED',
  delivery_fail: 'FAILED',
  waiting_to_return: 'FAILED',
  return: 'RETURNED',
  return_transporting: 'RETURNED',
  return_sorting: 'RETURNED',
  returning: 'RETURNED',
  return_fail: 'FAILED',
  returned: 'RETURNED',
  exception: 'FAILED',
  damage: 'FAILED',
  lost: 'FAILED',
  cancel: 'CANCELLED',
}

@Controller('shipping/ghn')
@ApiTags('Shipping - GHN')
@ApiResponse({ status: 500, description: 'Internal server error' })
export class GhnController {
  private readonly logger = new Logger(GhnController.name)

  constructor(
    private readonly ghnService: GhnService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Lấy danh sách 63 Tỉnh/Thành phố từ GHN' })
  async getProvinces() {
    return await this.ghnService.getProvinces()
  }

  @Get('districts/:provinceId')
  @ApiOperation({ summary: 'Lấy danh sách Quận/Huyện theo Tỉnh' })
  async getDistricts(@Param('provinceId', ParseIntPipe) provinceId: number) {
    return await this.ghnService.getDistricts(provinceId)
  }

  @Get('wards/:districtId')
  @ApiOperation({ summary: 'Lấy danh sách Phường/Xã theo Quận' })
  async getWards(@Param('districtId', ParseIntPipe) districtId: number) {
    return await this.ghnService.getWards(districtId)
  }

  @Post('calculate-fee')
  @ApiOperation({ summary: 'Tính cước phí vận chuyển GHN theo trọng lượng & địa chỉ' })
  async calculateFee(@Body() dto: CalculateFeeDto) {
    return await this.ghnService.calculateFee(dto)
  }

  @Post('leadtime')
  @ApiOperation({ summary: 'Tính thời gian giao hàng dự kiến' })
  async calculateLeadTime(@Body() dto: LeadTimeDto) {
    return await this.ghnService.calculateLeadTime(dto)
  }

  @Post('create-order')
  @ApiOperation({ summary: 'Tạo đơn vận chuyển trên GHN & nhận mã vận đơn' })
  async createOrder(@Body() dto: CreateGhnOrderDto) {
    return await this.ghnService.createShippingOrder(dto)
  }

  @Post('print-token')
  @ApiOperation({ summary: 'Tạo token in tem vận đơn A5 / 80x80' })
  async getPrintToken(@Body() dto: PrintTokenDto) {
    return await this.ghnService.genPrintToken(dto.orderCodes)
  }

  @Get('order/:orderCode')
  @ApiOperation({ summary: 'Xem chi tiết và lịch sử vận đơn trên GHN' })
  async getOrderDetail(@Param('orderCode') orderCode: string) {
    return await this.ghnService.getOrderDetail(orderCode)
  }

  @Post('cancel-order')
  @ApiOperation({ summary: 'Hủy đơn hàng trên GHN' })
  async cancelOrder(@Body() dto: PrintTokenDto) {
    return await this.ghnService.cancelOrder(dto.orderCodes)
  }

  @Post('update-order')
  @ApiOperation({ summary: 'Cập nhật thông tin đơn hàng trên GHN' })
  async updateOrder(@Body() dto: UpdateGhnOrderDto) {
    return await this.ghnService.updateShippingOrder(dto)
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook nhận callback cập nhật trạng thái từ GHN' })
  async handleGhnWebhook(@Body() payload: any) {
    this.logger.log(`GHN Webhook received: ${JSON.stringify(payload)}`)

    const ghnTrackingCode = String(
      payload?.OrderCode || payload?.order_code || payload?.data?.OrderCode || '',
    ).trim()
    const rawStatus = String(
      payload?.Status || payload?.status || payload?.data?.Status || '',
    ).toLowerCase()

    if (!ghnTrackingCode) {
      return { status: 'ignored', message: 'Không tìm thấy OrderCode trong webhook GHN' }
    }

    const mappedStatus = GHN_STATUS_MAP[rawStatus]
    if (!mappedStatus) {
      this.logger.warn(`Trạng thái GHN chưa map: ${rawStatus}`)
      return { status: 'ignored', message: `Trạng thái ${rawStatus} không yêu cầu đồng bộ` }
    }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const order = await queryRunner.manager.findOne(BookstoreOrder, {
        where: [{ trackingCode: ghnTrackingCode }, { orderCode: ghnTrackingCode }],
        lock: { mode: 'pessimistic_write' },
      })

      if (!order) {
        this.logger.warn(`Không tìm thấy đơn hàng có mã tracking: ${ghnTrackingCode}`)
        await queryRunner.rollbackTransaction()
        return {
          status: 'not_found',
          message: `Không tìm thấy đơn hàng với mã ${ghnTrackingCode}`,
        }
      }

      const previousStatus = order.status
      const shouldRestock =
        ['CANCELLED', 'RETURNED'].includes(mappedStatus) &&
        !['CANCELLED', 'RETURNED'].includes(previousStatus)

      // Restock books if cancelled / returned via GHN
      if (shouldRestock && order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const bookIdNum =
            typeof item.bookId === 'number' ? item.bookId : parseInt(String(item.bookId), 10)
          if (!isNaN(bookIdNum)) {
            const book = await queryRunner.manager.findOne(Book, {
              where: { id: bookIdNum },
              lock: { mode: 'pessimistic_write' },
            })
            if (book) {
              const beforeStock = Number(book.stock)
              const afterStock = beforeStock + (item.quantity || 0)
              const newBookStatus =
                afterStock === 0 ? 'OUT_OF_STOCK' : afterStock <= (book.minStock || 10) ? 'LOW_STOCK' : 'IN_STOCK'

              book.stock = afterStock
              book.status = newBookStatus
              await queryRunner.manager.save(Book, book)

              const movement = queryRunner.manager.create(StockMovement, {
                bookId: book.id,
                bookTitle: book.title,
                type: 'RESTOCK',
                quantity: item.quantity,
                beforeStock,
                afterStock,
                referenceCode: order.orderCode,
                note: `GHN Webhook (${rawStatus}): Hoàn kho tự động cho đơn ${order.orderCode}`,
                createdBy: 'GHN/Webhook',
              })
              await queryRunner.manager.save(StockMovement, movement)
            }
          }
        }
      }

      const previousPayment = order.payment

      // Update status & payment
      order.status = mappedStatus
      if (mappedStatus === 'DELIVERED') {
        order.payment = 'PAID'
      } else if (mappedStatus === 'RETURNED' && order.payment === 'PAID') {
        order.payment = 'REFUNDED'
      }

      await queryRunner.manager.save(BookstoreOrder, order)

      // Record Order History
      const history = queryRunner.manager.create(OrderHistory, {
        orderId: order.id,
        orderCode: order.orderCode,
        action: 'GHN_SYNC',
        fromStatus: String(previousStatus),
        toStatus: mappedStatus,
        fromPayment: String(previousPayment),
        toPayment: String(order.payment),
        title: `Đồng bộ GHN: ${previousStatus} → ${mappedStatus}`,
        note: `GHN Webhook cập nhật trạng thái vận đơn (${rawStatus} → ${mappedStatus}). Mã vận đơn: ${ghnTrackingCode}.`,
        actor: 'GHN Webhook',
        actorRole: 'WEBHOOK',
        metadata: {
          ghnTrackingCode,
          rawStatus,
          mappedStatus,
          shouldRestock,
        },
      })
      await queryRunner.manager.save(OrderHistory, history)

      await queryRunner.commitTransaction()

      this.logger.log(`GHN Webhook: Đã đồng bộ đơn ${order.orderCode} sang ${mappedStatus}`)

      return {
        status: 'success',
        message: `Đã đồng bộ đơn hàng ${order.orderCode} sang trạng thái ${mappedStatus}`,
        orderCode: order.orderCode,
        trackingCode: ghnTrackingCode,
        nextStatus: mappedStatus,
        payment: order.payment,
      }
    } catch (err: any) {
      await queryRunner.rollbackTransaction()
      this.logger.error('Lỗi khi xử lý GHN Webhook:', err)
      return { status: 'error', message: err.message }
    } finally {
      await queryRunner.release()
    }
  }
}
