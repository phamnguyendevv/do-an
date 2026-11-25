import { Controller, Get, Param, Post } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'

import { SpxService } from '@infrastructure/services/spx/spx.service'

@Controller('shipping/spx')
@ApiTags('Shipping - SPX Express (Shopee Xpress)')
@ApiResponse({ status: 500, description: 'Internal server error' })
export class SpxController {
  constructor(private readonly spxService: SpxService) {}

  @Get('track/:trackingCode')
  @ApiOperation({
    summary: 'Tra cứu hành trình và thông tin đơn hàng bằng mã vận đơn SPX',
    description:
      'Truy vấn trực tiếp cổng SPX Express kết hợp với dữ liệu đơn hàng trong hệ thống BookStore',
  })
  @ApiParam({
    name: 'trackingCode',
    description: 'Mã vận đơn SPX (ví dụ: SPXVN0312345678, SPX...)',
    example: 'SPXVN0312345678',
  })
  async trackByTrackingCode(@Param('trackingCode') trackingCode: string) {
    return await this.spxService.trackOrder(trackingCode)
  }

  @Get('order/:orderCode')
  @ApiOperation({
    summary: 'Tra cứu hành trình vận đơn SPX theo mã đơn hàng BookStore',
    description:
      'Tìm đơn hàng theo mã đơn, lấy mã tracking SPX và truy vấn hành trình',
  })
  @ApiParam({
    name: 'orderCode',
    description: 'Mã đơn hàng (ví dụ: ORD-20261121-0001)',
    example: 'ORD-20261121-0001',
  })
  async trackByOrderCode(@Param('orderCode') orderCode: string) {
    return await this.spxService.trackOrder(orderCode)
  }

  @Post('sync/:trackingCode')
  @ApiOperation({
    summary: 'Đồng bộ trạng thái giao hàng từ SPX vào đơn hàng',
    description:
      'Nếu kiện hàng SPX đã chuyển trạng thái DELIVERED/RETURNED/CANCELLED, tự động cập nhật đơn hàng trong DB',
  })
  async syncOrderStatus(@Param('trackingCode') trackingCode: string) {
    return await this.spxService.syncOrderStatus(trackingCode)
  }
}
