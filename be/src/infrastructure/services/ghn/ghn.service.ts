import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface GhnProvince {
  ProvinceID: number
  ProvinceName: string
  Code: string
}

export interface GhnDistrict {
  DistrictID: number
  ProvinceID: number
  DistrictName: string
  Code: string
}

export interface GhnWard {
  WardCode: string
  DistrictID: number
  WardName: string
}

export interface GhnCalculateFeeInput {
  toDistrictId: number
  toWardCode: string
  weight: number // in grams
  length?: number // in cm
  width?: number // in cm
  height?: number // in cm
  insuranceValue?: number // in VND
  serviceTypeId?: number
  serviceId?: number
  coupon?: string
}

export interface GhnCreateOrderItem {
  name: string
  code?: string
  quantity: number
  price: number
  length?: number
  width?: number
  height?: number
  weight?: number
  category?: {
    level1?: string
  }
}

export interface GhnCreateOrderInput {
  clientOrderCode: string
  toName: string
  toPhone: string
  toAddress: string
  toWardCode: string
  toDistrictId: number
  codAmount?: number
  content?: string
  weight: number
  length?: number
  width?: number
  height?: number
  insuranceValue?: number
  paymentTypeId?: number // 1: Shop pays shipping fee, 2: Receiver pays shipping fee
  requiredNote?: 'CHOTHUHANG' | 'CHOXEMHANGKHONGTHU' | 'KHONGCHOXEMHANG'
  note?: string
  items: GhnCreateOrderItem[]
}

@Injectable()
export class GhnService {
  private readonly logger = new Logger(GhnService.name)
  private readonly apiUrl: string
  private readonly token: string
  private readonly shopId: number
  private readonly fromDistrictId: number
  private readonly fromWardCode: string

  constructor(private readonly configService: ConfigService) {
    this.apiUrl =
      this.configService.get<string>('GHN_API_URL') ||
      'https://dev-online-gateway.ghn.vn/shiip/public-api'
    this.token =
      this.configService.get<string>('GHN_TOKEN') ||
      '7edb78b6-a174-11f1-a973-aee5264794df'
    this.shopId = Number(this.configService.get<number>('GHN_SHOP_ID')) || 216414
    this.fromDistrictId =
      Number(this.configService.get<number>('GHN_FROM_DISTRICT_ID')) || 1442
    this.fromWardCode =
      this.configService.get<string>('GHN_FROM_WARD_CODE') || '20109'
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST'
      body?: Record<string, unknown>
      withShopId?: boolean
    } = {},
  ): Promise<T> {
    const method = options.method || (options.body ? 'POST' : 'GET')
    const url = `${this.apiUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Token: this.token,
    }

    if (options.withShopId && this.shopId) {
      headers['ShopId'] = String(this.shopId)
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      const json = await response.json()

      if (!response.ok || json.code !== 200) {
        this.logger.error(`GHN API Error [${endpoint}]:`, json)
        throw new Error(json.message || json.code_message || 'GHN API Request Failed')
      }

      return json.data as T
    } catch (err: any) {
      this.logger.error(`GHN API Request Exception [${endpoint}]: ${err.message}`)
      throw err
    }
  }

  /**
   * 1. Get 63 provinces
   */
  async getProvinces(): Promise<GhnProvince[]> {
    return this.request<GhnProvince[]>('/master-data/province')
  }

  /**
   * 2. Get districts by province
   */
  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    return this.request<GhnDistrict[]>('/master-data/district', {
      method: 'POST',
      body: { province_id: Number(provinceId) },
    })
  }

  /**
   * 3. Get wards by district
   */
  async getWards(districtId: number): Promise<GhnWard[]> {
    return this.request<GhnWard[]>(`/master-data/ward?district_id=${districtId}`, {
      method: 'POST',
      body: { district_id: Number(districtId) },
    })
  }

  /**
   * 4. Calculate shipping fee
   */
  async calculateFee(input: GhnCalculateFeeInput) {
    const payload = {
      from_district_id: this.fromDistrictId,
      from_ward_code: this.fromWardCode,
      service_type_id: input.serviceTypeId || 2, // Standard E-commerce service
      to_district_id: Number(input.toDistrictId),
      to_ward_code: String(input.toWardCode),
      height: Number(input.height || 10),
      length: Number(input.length || 20),
      width: Number(input.width || 15),
      weight: Number(input.weight || 500),
      insurance_value: Number(input.insuranceValue || 0),
      coupon: input.coupon || null,
    }

    return this.request<{
      total: number
      service_fee: number
      insurance_fee: number
      pick_station_fee: number
      coupon_value: number
      r2s_fee: number
    }>('/v2/shipping-order/fee', {
      method: 'POST',
      body: payload,
      withShopId: true,
    })
  }

  /**
   * 5. Calculate expected delivery lead time
   */
  async calculateLeadTime(input: {
    toDistrictId: number
    toWardCode: string
    serviceId?: number
  }) {
    const payload = {
      from_district_id: this.fromDistrictId,
      from_ward_code: this.fromWardCode,
      to_district_id: Number(input.toDistrictId),
      to_ward_code: String(input.toWardCode),
      service_id: input.serviceId || 53320,
    }

    return this.request<{
      leadtime: number
      order_date: number
    }>('/v2/shipping-order/leadtime', {
      method: 'POST',
      body: payload,
      withShopId: true,
    })
  }

  /**
   * 6. Create Shipping Order
   */
  async createShippingOrder(input: GhnCreateOrderInput) {
    const payload = {
      payment_type_id: input.paymentTypeId || 2, // 1: Shop pays, 2: Customer pays
      note: input.note || 'Sách BookStock đóng gói cẩn thận',
      required_note: input.requiredNote || 'CHOXEMHANGKHONGTHU',
      client_order_code: input.clientOrderCode,
      to_name: input.toName,
      to_phone: input.toPhone,
      to_address: input.toAddress,
      to_ward_code: String(input.toWardCode),
      to_district_id: Number(input.toDistrictId),
      cod_amount: Number(input.codAmount || 0),
      content: input.content || `Đơn hàng sách BookStock ${input.clientOrderCode}`,
      weight: Number(input.weight || 500),
      length: Number(input.length || 20),
      width: Number(input.width || 15),
      height: Number(input.height || 10),
      insurance_value: Number(input.insuranceValue || 0),
      service_type_id: 2,
      items: input.items.map((item) => ({
        name: item.name,
        code: item.code || '',
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        weight: Number(item.weight || 300),
        length: Number(item.length || 20),
        width: Number(item.width || 15),
        height: Number(item.height || 3),
        category: {
          level1: item.category?.level1 || 'Sách',
        },
      })),
    }

    return this.request<{
      order_code: string
      sort_code: string
      trans_type: string
      total_fee: number
      expected_delivery_time: string
    }>('/v2/shipping-order/create', {
      method: 'POST',
      body: payload,
      withShopId: true,
    })
  }

  /**
   * 7. Generate Print Token for A5 / 80x80 labels
   */
  async genPrintToken(orderCodes: string[]) {
    const result = await this.request<{ token: string }>('/v2/a5/gen-token', {
      method: 'POST',
      body: { order_codes: orderCodes },
    })

    const baseUrl = this.apiUrl.includes('dev-online-gateway')
      ? 'https://dev-online-gateway.ghn.vn/a5/index.html?token='
      : 'https://online-gateway.ghn.vn/a5/index.html?token='

    return {
      token: result.token,
      printUrl: `${baseUrl}${result.token}`,
    }
  }

  /**
   * 8. Get order details from GHN
   */
  async getOrderDetail(orderCode: string) {
    return this.request<Record<string, unknown>>('/v2/shipping-order/detail', {
      method: 'POST',
      body: { order_code: orderCode },
    })
  }

  /**
   * 9. Cancel order on GHN
   */
  async cancelOrder(orderCodes: string[]) {
    return this.request<unknown>('/v2/shipping-order/cancel', {
      method: 'POST',
      body: { order_codes: orderCodes },
      withShopId: true,
    })
  }
}
