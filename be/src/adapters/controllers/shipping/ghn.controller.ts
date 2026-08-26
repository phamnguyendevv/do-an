import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { GhnService } from '@infrastructure/services/ghn/ghn.service'
import {
  CalculateFeeDto,
  CreateGhnOrderDto,
  LeadTimeDto,
  PrintTokenDto,
} from './dto/ghn-shipping.dto'

@Controller('shipping/ghn')
@ApiTags('Shipping - GHN')
@ApiResponse({ status: 500, description: 'Internal server error' })
export class GhnController {
  constructor(private readonly ghnService: GhnService) {}

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

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook nhận callback cập nhật trạng thái từ GHN' })
  async handleGhnWebhook(@Body() payload: any) {
    // GHN gửi callback khi bưu tá đổi trạng thái: picking, delivering, delivered, return...
    return {
      status: 'success',
      message: 'GHN Webhook received',
      orderCode: payload?.OrderCode || payload?.order_code,
    }
  }
}
