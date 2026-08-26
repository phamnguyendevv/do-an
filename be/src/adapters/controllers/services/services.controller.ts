import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { CreateServiceUseCase } from '@use-cases/services/create-service.use-case'
import { DeleteMyServiceUseCase } from '@use-cases/services/delete-my-service.use-case'
import { GetDetailServiceUseCase } from '@use-cases/services/get-detail-service.use-case'
import { GetListServiceUseCase } from '@use-cases/services/get-list-category.use-case'
import { UpdateServiceUseCase } from '@use-cases/services/update-service.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import {
  ApiCreatedResponseType,
  ApiResponseType,
} from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CreateServiceDto } from './dto/create-service.dto'
import { GetListServicesDto } from './dto/get-list-service.dto'
import { UpdateServiceDto } from './dto/update-service.dto'
import { CreateServicePresenter } from './presenters/create-service.presenter'
import { GetDetailServicePresenter } from './presenters/get-detail-service.presenter'
import { GetListServicesPresenter } from './presenters/get-list-services.presenter'

@Controller()
@ApiTags('Services')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@ApiExtraModels(GetDetailServicePresenter, CreateServicePresenter)
export class ServicesController {
  constructor(
    private readonly getListServicesUseCase: GetListServiceUseCase,
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly getDetailServiceUseCase: GetDetailServiceUseCase,
    private readonly deleteMyServiceUseCase: DeleteMyServiceUseCase,
  ) {}

  @Get('/users/services/search')
  @ApiOperation({
    summary: 'Get all services',
    description: 'Retrieve a list of all services',
  })
  @ApiResponseType(GetDetailServicePresenter, true)
  @ApiResponse({
    status: 200,
    description: 'List of services retrieved successfully',
  })
  async getListServices(
    @Query() queryParams: GetListServicesDto,
  ): Promise<GetListServicesPresenter> {
    const { data, pagination } =
      await this.getListServicesUseCase.execute(queryParams)
    return new GetListServicesPresenter(data, pagination)
  }

  @Get('/users/services/:id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiResponseType(GetDetailServicePresenter, false)
  async getServiceById(@Param('id', ParseIntPipe) id: number) {
    const service = await this.getDetailServiceUseCase.execute({
      id,
    })
    return new GetDetailServicePresenter(service)
  }

  @Delete('/provider/services/:id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a service' })
  @CheckPolicies({ action: 'delete', subject: 'Service' })
  async deleteService(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
  ): Promise<boolean> {
    const isDeleted = await this.deleteMyServiceUseCase.execute(id, userId)
    return isDeleted
  }

  @Post('/provider/services')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service' })
  @CheckPolicies({ action: 'create', subject: 'Service' })
  @ApiCreatedResponseType(CreateServicePresenter, false)
  async createService(
    @Body() createServiceDto: CreateServiceDto,
    @User('id') userId: number,
  ) {
    const service = await this.createServiceUseCase.execute(
      createServiceDto,
      userId,
    )
    return new CreateServicePresenter(service)
  }

  @Put('/provider/services/:id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing service' })
  @ApiOkResponse({ description: 'Service updated successfully' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @CheckPolicies({ action: 'update', subject: 'Service' })
  async updateService(
    @Body() updateServiceData: UpdateServiceDto,
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
  ) {
    const updatedService = await this.updateServiceUseCase.execute(
      { id, userId },
      updateServiceData,
    )
    return updatedService
  }

  @Get('/provider/services')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all services for provider',
    description: 'Retrieve a list of all services for the provider',
  })
  @ApiResponseType(GetDetailServicePresenter, true)
  @ApiResponse({
    status: 200,
    description: 'List of provider services retrieved successfully',
  })
  async getProviderServices(
    @User('id') userId: number,
  ): Promise<GetListServicesPresenter> {
    const { data, pagination } = await this.getListServicesUseCase.execute({
      providerId: userId,
    })
    return new GetListServicesPresenter(data, pagination)
  }
}
