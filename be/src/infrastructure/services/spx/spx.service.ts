import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'

import { OrderStatusEnum } from '@domain/entities/order-enums.entity'

import { BookstoreOrder } from '@infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { OrderHistory } from '@infrastructure/databases/postgresql/entities/order-history.entity'

export interface SpxRawCheckpoint {
  status?: string | number
  timestamp?: number
  message?: string
  location?: string
}

export interface SpxTrackingCheckpoint {
  time: string
  timeFormatted: string
  status: string
  description: string
  location?: string
}

export interface SpxTrackResult {
  success: boolean
  trackingCode: string
  carrier: string
  carrierUrl: string
  status: string
  statusText: string
  statusCode?: string | number
  source: 'SPX_API' | 'SYSTEM_ESTIMATE' | 'NOT_FOUND'
  isDelivered: boolean
  isReturned: boolean
  isCancelled: boolean
  isShipping: boolean
  checkpoints: SpxTrackingCheckpoint[]
  order?: {
    id: number
    orderCode: string
    customerName: string
    customerPhone: string
    customerAddress: string
    subtotal: number
    shippingFee: number
    total: number
    payment: string
    status: string
    shippingMethod: string
    trackingCode?: string
    note?: string
    items: any[]
    createdAt: Date
    updatedAt: Date
  } | null
  message?: string
}

const SPX_STATUS_MAP: Record<
  string,
  { label: string; orderStatus: OrderStatusEnum }
> = {
  // Common SPX numeric and text status codes
  '1': { label: 'Đơn hàng đã được tạo', orderStatus: OrderStatusEnum.Preparing },
  '2': {
    label: 'SPX đã tiếp nhận kiện hàng',
    orderStatus: OrderStatusEnum.Preparing,
  },
  '3': {
    label: 'Đang luân chuyển / Trung chuyển bưu cục',
    orderStatus: OrderStatusEnum.Shipping,
  },
  '4': {
    label: 'Đang giao hàng tới người nhận',
    orderStatus: OrderStatusEnum.Shipping,
  },
  '5': {
    label: 'Giao hàng thành công',
    orderStatus: OrderStatusEnum.Delivered,
  },
  '6': {
    label: 'Giao hàng thất bại / Chờ giao lại',
    orderStatus: OrderStatusEnum.Failed,
  },
  '7': { label: 'Đang hoàn hàng', orderStatus: OrderStatusEnum.Returned },
  '8': { label: 'Đơn hàng đã hủy', orderStatus: OrderStatusEnum.Cancelled },

  // String status codes
  ORDER_CREATED: {
    label: 'Đơn hàng đã được tạo',
    orderStatus: OrderStatusEnum.Preparing,
  },
  PICKED_UP: {
    label: 'SPX đã lấy hàng',
    orderStatus: OrderStatusEnum.Preparing,
  },
  IN_TRANSIT: {
    label: 'Đang vận chuyển',
    orderStatus: OrderStatusEnum.Shipping,
  },
  DELIVERING: {
    label: 'Đang giao đến người nhận',
    orderStatus: OrderStatusEnum.Shipping,
  },
  OUT_FOR_DELIVERY: {
    label: 'Đang giao hàng',
    orderStatus: OrderStatusEnum.Shipping,
  },
  DELIVERED: {
    label: 'Giao hàng thành công',
    orderStatus: OrderStatusEnum.Delivered,
  },
  DELIVERY_FAILED: {
    label: 'Giao hàng thất bại',
    orderStatus: OrderStatusEnum.Failed,
  },
  RETURNING: {
    label: 'Đang chuyển hoàn',
    orderStatus: OrderStatusEnum.Returned,
  },
  RETURNED: {
    label: 'Đã trả hàng cho người gửi',
    orderStatus: OrderStatusEnum.Returned,
  },
  CANCELLED: {
    label: 'Đã hủy đơn',
    orderStatus: OrderStatusEnum.Cancelled,
  },
}

@Injectable()
export class SpxService {
  private readonly logger = new Logger(SpxService.name)
  private readonly spxApiUrl =
    'https://spx.vn/api/v2/fleet_order/tracking/search'

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Tra cứu hành trình đơn hàng bằng mã vận đơn SPX (Shopee Xpress)
   * Kết hợp API chính thức của SPX + Dữ liệu đơn hàng nội bộ trong hệ thống
   */
  async trackOrder(rawTrackingCode: string): Promise<SpxTrackResult> {
    const trackingCode = (rawTrackingCode || '').trim().toUpperCase()
    if (!trackingCode) {
      return {
        success: false,
        trackingCode: '',
        carrier: 'Shopee Xpress (SPX)',
        carrierUrl: 'https://spx.vn',
        status: 'UNKNOWN',
        statusText: 'Vui lòng cung cấp mã vận đơn',
        source: 'NOT_FOUND',
        isDelivered: false,
        isReturned: false,
        isCancelled: false,
        isShipping: false,
        checkpoints: [],
        order: null,
        message: 'Mã vận đơn SPX không hợp lệ',
      }
    }

    const carrierUrl = `https://spx.vn/track?tracking_number=${encodeURIComponent(
      trackingCode,
    )}`

    // 1. Tìm đơn hàng tương ứng trong cơ sở dữ liệu hệ thống
    const orderRepo = this.dataSource.getRepository(BookstoreOrder)
    const order = await orderRepo.findOne({
      where: [{ trackingCode }, { orderCode: trackingCode }],
    })

    // 2. Gọi API công khai của SPX
    let spxData: any = null
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await fetch(
        `${this.spxApiUrl}?sls_tracking_number=${encodeURIComponent(
          trackingCode,
        )}`,
        {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
          },
          signal: controller.signal,
        },
      )
      clearTimeout(timeoutId)

      if (response.ok) {
        const json = await response.json()
        if (json && json.retcode === 0 && json.data) {
          spxData = json.data
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Không thể kết nối tới SPX API cho mã ${trackingCode}: ${err.message}`,
      )
    }

    // 3. Phân tích kết quả từ SPX nếu có dữ liệu
    const trackingList: SpxRawCheckpoint[] = spxData?.tracking_list || []
    if (trackingList.length > 0) {
      const checkpoints: SpxTrackingCheckpoint[] = trackingList.map((cp) => {
        const dateObj = cp.timestamp
          ? new Date(cp.timestamp > 1e11 ? cp.timestamp : cp.timestamp * 1000)
          : new Date()
        return {
          time: dateObj.toISOString(),
          timeFormatted: dateObj.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          status: String(cp.status || ''),
          description: cp.message || '',
          location: cp.location || '',
        }
      })

      // Checkpoint mới nhất thường ở vị trí đầu hoặc cuối
      const latest = checkpoints[0]
      const rawStatusStr = String(latest.status || '').toUpperCase()
      const mapped =
        SPX_STATUS_MAP[rawStatusStr] || SPX_STATUS_MAP[String(latest.status)]

      const statusText =
        mapped?.label || latest.description || 'Đang vận chuyển'
      const isDelivered =
        rawStatusStr === '5' ||
        rawStatusStr === 'DELIVERED' ||
        statusText.toLowerCase().includes('thành công')
      const isReturned =
        rawStatusStr === '7' ||
        rawStatusStr === 'RETURNED' ||
        statusText.toLowerCase().includes('hoàn')
      const isCancelled =
        rawStatusStr === '8' ||
        rawStatusStr === 'CANCELLED' ||
        statusText.toLowerCase().includes('hủy')

      return {
        success: true,
        trackingCode,
        carrier: 'Shopee Xpress (SPX)',
        carrierUrl,
        statusCode: latest.status,
        status: rawStatusStr || 'IN_TRANSIT',
        statusText,
        source: 'SPX_API',
        isDelivered,
        isReturned,
        isCancelled,
        isShipping: !isDelivered && !isReturned && !isCancelled,
        checkpoints,
        order: order ? this.mapOrderSummary(order) : null,
      }
    }

    // 4. Nếu SPX chưa có dữ liệu hành trình nhưng hệ thống có lưu đơn hàng
    if (order) {
      const checkpoints: SpxTrackingCheckpoint[] = []
      const createdDate = order.createdAt ? new Date(order.createdAt) : new Date()

      checkpoints.push({
        time: createdDate.toISOString(),
        timeFormatted: createdDate.toLocaleString('vi-VN'),
        status: 'ORDER_CREATED',
        description: `Đơn hàng ${order.orderCode} đã tạo trên hệ thống BookStore. Mã vận đơn SPX: ${trackingCode}`,
      })

      if (
        order.status === OrderStatusEnum.Preparing ||
        order.status === OrderStatusEnum.Confirmed
      ) {
        checkpoints.unshift({
          time: new Date(createdDate.getTime() + 15 * 60000).toISOString(),
          timeFormatted: new Date(
            createdDate.getTime() + 15 * 60000,
          ).toLocaleString('vi-VN'),
          status: 'PREPARING',
          description: 'Người bán đang chuẩn bị hàng gửi cho SPX Express',
        })
      } else if (order.status === OrderStatusEnum.Shipping) {
        checkpoints.unshift({
          time: new Date(createdDate.getTime() + 60 * 60000).toISOString(),
          timeFormatted: new Date(
            createdDate.getTime() + 60 * 60000,
          ).toLocaleString('vi-VN'),
          status: 'IN_TRANSIT',
          description: 'Kiện hàng đã bàn giao cho shipper SPX và đang trên đường giao',
        })
      } else if (order.status === OrderStatusEnum.Delivered) {
        checkpoints.unshift({
          time: new Date(createdDate.getTime() + 120 * 60000).toISOString(),
          timeFormatted: new Date(
            createdDate.getTime() + 120 * 60000,
          ).toLocaleString('vi-VN'),
          status: 'DELIVERED',
          description: 'Kiện hàng đã giao thành công tới người nhận',
        })
      }

      const isDelivered = order.status === OrderStatusEnum.Delivered
      const isReturned = order.status === OrderStatusEnum.Returned
      const isCancelled = order.status === OrderStatusEnum.Cancelled

      return {
        success: true,
        trackingCode,
        carrier: 'Shopee Xpress (SPX)',
        carrierUrl,
        status: String(order.status),
        statusText: this.getOrderStatusLabel(order.status),
        source: 'SYSTEM_ESTIMATE',
        isDelivered,
        isReturned,
        isCancelled,
        isShipping: order.status === OrderStatusEnum.Shipping,
        checkpoints,
        order: this.mapOrderSummary(order),
        message:
          'Đã tìm thấy đơn hàng trong hệ thống. Vận đơn SPX đang chờ cập nhật mốc bưu cục trên cổng SPX.',
      }
    }

    // 5. Không tìm thấy cả trên SPX lẫn hệ thống
    return {
      success: false,
      trackingCode,
      carrier: 'Shopee Xpress (SPX)',
      carrierUrl,
      status: 'NOT_FOUND',
      statusText: 'Chưa có thông tin vận đơn',
      source: 'NOT_FOUND',
      isDelivered: false,
      isReturned: false,
      isCancelled: false,
      isShipping: false,
      checkpoints: [],
      order: null,
      message: `Không tìm thấy thông tin cho mã vận đơn "${trackingCode}". Bạn có thể kiểm tra trực tiếp trên cổng tra cứu của SPX.`,
    }
  }

  /**
   * Đồng bộ trạng thái đơn hàng trong DB từ mã SPX nếu có
   */
  async syncOrderStatus(trackingCode: string): Promise<{
    updated: boolean
    orderCode?: string
    oldStatus?: string
    newStatus?: string
    message: string
  }> {
    const trackInfo = await this.trackOrder(trackingCode)
    if (!trackInfo.order) {
      return {
        updated: false,
        message: `Không tìm thấy đơn hàng trong hệ thống có mã vận đơn ${trackingCode}`,
      }
    }

    if (trackInfo.source !== 'SPX_API') {
      return {
        updated: false,
        message: 'Chưa có dữ liệu mới từ cổng SPX để đồng bộ',
      }
    }

    const orderRepo = this.dataSource.getRepository(BookstoreOrder)
    const historyRepo = this.dataSource.getRepository(OrderHistory)

    const order = await orderRepo.findOne({
      where: { id: trackInfo.order.id },
    })
    if (!order) {
      return { updated: false, message: 'Đơn hàng không tồn tại' }
    }

    let targetStatus: OrderStatusEnum | null = null
    if (trackInfo.isDelivered) {
      targetStatus = OrderStatusEnum.Delivered
    } else if (trackInfo.isReturned) {
      targetStatus = OrderStatusEnum.Returned
    } else if (trackInfo.isCancelled) {
      targetStatus = OrderStatusEnum.Cancelled
    } else if (trackInfo.isShipping) {
      targetStatus = OrderStatusEnum.Shipping
    }

    if (!targetStatus || targetStatus === order.status) {
      return {
        updated: false,
        orderCode: order.orderCode,
        oldStatus: String(order.status),
        message: 'Trạng thái đơn hàng đã đồng bộ, không cần cập nhật',
      }
    }

    const oldStatus = order.status
    order.status = targetStatus
    await orderRepo.save(order)

    // Tạo lịch sử đơn hàng
    try {
      const history = historyRepo.create({
        orderId: order.id,
        action: 'SPX_SYNC',
        note: `Đồng bộ trạng thái từ SPX Express: ${oldStatus} → ${targetStatus} (Mã vận đơn: ${trackingCode})`,
      })
      await historyRepo.save(history)
    } catch {
      // bỏ qua lỗi history
    }

    return {
      updated: true,
      orderCode: order.orderCode,
      oldStatus: String(oldStatus),
      newStatus: String(targetStatus),
      message: `Đã cập nhật trạng thái đơn ${order.orderCode} thành ${targetStatus}`,
    }
  }

  private mapOrderSummary(order: BookstoreOrder) {
    return {
      id: order.id,
      orderCode: order.orderCode,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      subtotal: Number(order.subtotal || 0),
      shippingFee: Number(order.shippingFee || 0),
      total: Number(order.total || 0),
      payment: String(order.payment || ''),
      status: String(order.status || ''),
      shippingMethod: order.shippingMethod,
      trackingCode: order.trackingCode,
      note: order.note,
      items: order.items || [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }
  }

  private getOrderStatusLabel(status: any): string {
    const map: Record<string, string> = {
      PENDING: 'Chờ xử lý',
      CONFIRMED: 'Đã xác nhận',
      PREPARING: 'Đang chuẩn bị',
      SHIPPING: 'Đang giao hàng',
      DELIVERED: 'Đã giao thành công',
      CANCELLED: 'Đã hủy',
      RETURNED: 'Đã hoàn hàng',
      FAILED: 'Giao thất bại',
    }
    return map[String(status)] || String(status)
  }
}
