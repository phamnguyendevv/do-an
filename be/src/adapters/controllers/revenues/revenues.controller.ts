import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { GetDailyRevenueUseCase } from '@use-cases/revenue/get-daily-revenue.use-case'
import { GetMonthlyRevenueUseCase } from '@use-cases/revenue/get-monthly-revenue.use-case'
import { GetOverviewRevenueUseCase } from '@use-cases/revenue/get-overview-revenue.use-case'
import { GetTopSellingBooksUseCase } from '@use-cases/revenue/get-top-books.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'

@Controller('admin/revenue')
@ApiTags('Revenue & Analytics - Doanh Thu & Thống Kê')
@ApiResponse({ status: 401, description: 'No authorization token was found' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class RevenueController {
  constructor(
    private readonly getOverviewRevenueUseCase: GetOverviewRevenueUseCase,
    private readonly getMonthlyRevenueUseCase: GetMonthlyRevenueUseCase,
    private readonly getDailyRevenueUseCase: GetDailyRevenueUseCase,
    private readonly getTopSellingBooksUseCase: GetTopSellingBooksUseCase,
  ) {}

  @Get('overview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tổng quan doanh thu, đơn hàng, sách bán ra' })
  @CheckPolicies({ action: 'read', subject: 'Revenue' })
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.getOverviewRevenueUseCase.execute({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  }

  @Get('monthly')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Doanh thu theo từng tháng (cho biểu đồ cột/vùng)' })
  @CheckPolicies({ action: 'read', subject: 'Revenue' })
  async getMonthly(@Query('months') months?: number) {
    return await this.getMonthlyRevenueUseCase.execute({
      months: months ? Number(months) : 6,
    })
  }

  @Get('daily')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Doanh thu theo từng ngày' })
  @CheckPolicies({ action: 'read', subject: 'Revenue' })
  async getDaily(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: number,
  ) {
    return await this.getDailyRevenueUseCase.execute({
      startDate,
      endDate,
      days: days ? Number(days) : 30,
    })
  }

  @Get('top-books')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top sách bán chạy nhất' })
  @CheckPolicies({ action: 'read', subject: 'Revenue' })
  async getTopBooks(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.getTopSellingBooksUseCase.execute({
      limit: limit ? Number(limit) : 10,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  }
}
