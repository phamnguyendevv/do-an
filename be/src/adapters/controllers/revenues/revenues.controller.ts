import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiExtraModels, ApiOperation } from '@nestjs/swagger'

import { GetDailyRevenueUseCase } from '@use-cases/revenue/get-daily-revenue.use-case'
import { GetMonthlyRevenueUseCase } from '@use-cases/revenue/get-monthly-revenue.use-case'
import { GetOverviewRevenueUseCase } from '@use-cases/revenue/get-overview-revenue.use-case'
import { GetProviderRevenueUseCase } from '@use-cases/revenue/get-provider-revenue.use-case'
import { GetRevenueByServiceUseCase } from '@use-cases/revenue/get-revenue-by-service.use-case'

import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { DailyRevenueDto } from './dto/daily-revenue.dto'
import { MonthlyRevenueDto } from './dto/monthly-revenue.dto '
import { ProviderRevenueDto } from './dto/provider-revenue.dto'
import { RevenueByServiceDto } from './dto/revenue-by-service.dto '
import { RevenueFilterDto } from './dto/revenue-filter.dto'
import { AdminRevenueOverviewPresenter } from './presenters/admin-revenue-overview.presenters'
import { DailyRevenuePresenter } from './presenters/daily-revenue.presenter'
import { GetProviderRevenuePresenter } from './presenters/get-provider-revenue.presenter'
import { MonthlyRevenuePresenter } from './presenters/monthly-revenue.presenter'
import { RevenueByServicePresenter } from './presenters/revenue-by-service.presenter'
import { RevenueOverviewPresenter } from './presenters/revenue-overview.presenter'

@Controller()
@UseGuards(JwtAuthGuard)
export class RevenueController {
  constructor(
    private readonly getOverviewRevenueUseCase: GetOverviewRevenueUseCase,
    private readonly getMonthlyRevenueUseCase: GetMonthlyRevenueUseCase,
    private readonly getDailyRevenueUseCase: GetDailyRevenueUseCase,
    private readonly getRevenueByServiceUseCase: GetRevenueByServiceUseCase,
    private readonly getProviderRevenueUseCase: GetProviderRevenueUseCase,
  ) {}

  @Get('providers/revenue/overview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Overview', description: 'Overview revenue' })
  @ApiExtraModels(RevenueOverviewPresenter)
  @ApiResponseType(RevenueOverviewPresenter, false)
  async getOverview(
    @Query() filter: RevenueFilterDto,
    @User('id') userId: number,
  ) {
    const overview = await this.getOverviewRevenueUseCase.execute({
      ...filter,
      userId,
    })
    return new RevenueOverviewPresenter(overview)
  }

  @Get('providers/revenue/monthly')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Monthly', description: 'Monthly revenue' })
  @ApiExtraModels(MonthlyRevenueDto)
  @ApiResponseType(MonthlyRevenueDto, false)
  async getMonthly(
    @Query() filter: MonthlyRevenueDto,
    @User('id') userId: number,
  ) {
    const overview = await this.getMonthlyRevenueUseCase.execute({
      ...filter,
      userId,
    })
    return new MonthlyRevenuePresenter(overview, filter)
  }

  @Get('providers/revenue/daily')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Daily', description: 'Daily revenue' })
  @ApiExtraModels(DailyRevenueDto)
  @ApiResponseType(DailyRevenueDto, false)
  async getDaily(@Query() filter: DailyRevenueDto, @User('id') userId: number) {
    const overview = await this.getDailyRevenueUseCase.execute({
      ...filter,
      userId,
    })
    return new DailyRevenuePresenter(overview, filter)
  }

  @Get('admin/revenue/overview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Overview', description: 'Overview revenue' })
  @ApiExtraModels(AdminRevenueOverviewPresenter)
  @ApiResponseType(AdminRevenueOverviewPresenter, false)
  async getAdminOverview(@Query() filter: RevenueFilterDto) {
    const overview = await this.getOverviewRevenueUseCase.execute({
      ...filter,
      userId: 0,
    })
    return new AdminRevenueOverviewPresenter(overview)
  }

  @Get('admin/revenue/providers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Providers', description: 'Providers revenue' })
  @ApiExtraModels(GetProviderRevenuePresenter)
  @ApiResponseType(GetProviderRevenuePresenter, false)
  async getAdminProviders(@Query() filter: ProviderRevenueDto) {
    const { data, pagination } =
      await this.getProviderRevenueUseCase.execute(filter)
    return new GetProviderRevenuePresenter(data, pagination)
  }

  @Get('admin/revenue/top-services')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Top services',
    description: 'Top services revenue',
  })
  @ApiExtraModels(RevenueByServiceDto)
  @ApiResponseType(RevenueByServiceDto, false)
  async getTopServices() {
    const overview = await this.getRevenueByServiceUseCase.execute({
      userId: 0,
    })
    return RevenueByServicePresenter.getTopServices(overview, 6)
  }
}
