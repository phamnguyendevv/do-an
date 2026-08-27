import {
  Body,
  Controller,
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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { UserEntity } from '@domain/entities/user.entity'
import { AddOrderHistoryNoteUseCase } from '@use-cases/orders/add-order-history-note.use-case'
import { CreateBookstoreOrderUseCase } from '@use-cases/orders/create-order.use-case'
import { GetDetailBookstoreOrderUseCase } from '@use-cases/orders/get-detail-order.use-case'
import { GetListBookstoreOrdersUseCase } from '@use-cases/orders/get-list-orders.use-case'
import { GetListOrderHistoriesUseCase } from '@use-cases/orders/get-list-order-histories.use-case'
import { GetOrderHistoriesUseCase } from '@use-cases/orders/get-order-histories.use-case'
import { UpdateBookstoreOrderPaymentUseCase } from '@use-cases/orders/update-order-payment.use-case'
import { UpdateBookstoreOrderStatusUseCase } from '@use-cases/orders/update-order-status.use-case'
import { UpdateBookstoreOrderUseCase } from '@use-cases/orders/update-order.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { AddOrderNoteDto } from './dto/add-order-note.dto'
import { CreateBookstoreOrderDto } from './dto/create-order.dto'
import { GetListBookstoreOrdersDto } from './dto/get-list-orders.dto'
import { GetListOrderHistoriesDto } from './dto/get-list-order-histories.dto'
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { UpdateBookstoreOrderDto } from './dto/update-order.dto'

@Controller()
@ApiTags('Bookstore Orders')
@ApiResponse({ status: 401, description: 'No authorization token was found' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@ApiResponse({ status: 500, description: 'Internal error' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BookstoreOrdersController {
  constructor(
    private readonly getListOrdersUseCase: GetListBookstoreOrdersUseCase,
    private readonly createOrderUseCase: CreateBookstoreOrderUseCase,
    private readonly getDetailOrderUseCase: GetDetailBookstoreOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateBookstoreOrderStatusUseCase,
    private readonly updateOrderPaymentUseCase: UpdateBookstoreOrderPaymentUseCase,
    private readonly updateOrderUseCase: UpdateBookstoreOrderUseCase,
    private readonly getOrderHistoriesUseCase: GetOrderHistoriesUseCase,
    private readonly getListOrderHistoriesUseCase: GetListOrderHistoriesUseCase,
    private readonly addOrderHistoryNoteUseCase: AddOrderHistoryNoteUseCase,
  ) {}

  @Get('/admin/orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List bookstore orders', description: 'Admin/Staff can list all orders' })
  @CheckPolicies({ action: 'read', subject: 'BookstoreOrder' })
  async getOrders(@Query() queryParams: GetListBookstoreOrdersDto) {
    return await this.getListOrdersUseCase.execute(queryParams)
  }

  @Get('/admin/orders/histories/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List order audit logs', description: 'Get paginated audit logs for all orders' })
  @CheckPolicies({ action: 'read', subject: 'BookstoreOrder' })
  async getAllOrderHistories(@Query() queryParams: GetListOrderHistoriesDto) {
    return await this.getListOrderHistoriesUseCase.execute({
      ...queryParams,
      startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
      endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
    })
  }

  @Get('/admin/orders/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID or orderCode', description: 'Admin/Staff can read a single order' })
  @CheckPolicies({ action: 'read', subject: 'BookstoreOrder' })
  async getOrderById(@Param('id') id: string) {
    return await this.getDetailOrderUseCase.execute(id)
  }

  @Get('/admin/orders/:id/histories')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order audit timeline', description: 'Get chronological history for an order' })
  @CheckPolicies({ action: 'read', subject: 'BookstoreOrder' })
  async getOrderHistories(@Param('id') id: string) {
    return await this.getOrderHistoriesUseCase.execute(id)
  }

  @Post('/admin/orders/:id/notes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add note to order timeline', description: 'Staff can add internal notes to an order' })
  @CheckPolicies({ action: 'update', subject: 'BookstoreOrder' })
  async addOrderNote(
    @Param('id') id: string,
    @Body() dto: AddOrderNoteDto,
    @User() user?: any,
  ) {
    const actor = user?.username || user?.email || 'Staff'
    const actorRole = user?.role ? String(user.role) : undefined
    return await this.addOrderHistoryNoteUseCase.execute(id, dto.note, actor, actorRole)
  }

  @Post('/admin/orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create bookstore order', description: 'Admin/Staff create order and deduct stock' })
  @CheckPolicies({ action: 'create', subject: 'BookstoreOrder' })
  async createOrder(@Body() dto: CreateBookstoreOrderDto, @User() user?: any) {
    const actor = user?.username || user?.email || 'Admin/Staff'
    const actorRole = user?.role ? String(user.role) : undefined
    return await this.createOrderUseCase.execute({
      ...dto,
      actor,
      actorRole,
    })
  }

  @Put('/admin/orders/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update bookstore order', description: 'Admin/Staff update order info when status is PENDING' })
  @CheckPolicies({ action: 'update', subject: 'BookstoreOrder' })
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateBookstoreOrderDto,
    @User() user?: any,
  ) {
    const actor = user?.username || user?.email || 'Admin/Staff'
    const actorRole = user?.role ? String(user.role) : undefined
    return await this.updateOrderUseCase.execute(id, dto, { actor, actorRole })
  }

  @Put('/admin/orders/:id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status', description: 'Admin/Staff update order workflow status' })
  @CheckPolicies({ action: 'update', subject: 'BookstoreOrder' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @User() user?: any,
  ) {
    const actor = user?.username || user?.email || 'Admin/Staff'
    const actorRole = user?.role ? String(user.role) : undefined
    return await this.updateOrderStatusUseCase.execute(id, dto.status, {
      actor,
      actorRole,
    })
  }

  @Put('/admin/orders/:id/payment')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order payment', description: 'Admin/Staff update payment status' })
  @CheckPolicies({ action: 'update', subject: 'BookstoreOrder' })
  async updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderPaymentDto,
    @User() user?: any,
  ) {
    const actor = user?.username || user?.email || 'Admin/Staff'
    const actorRole = user?.role ? String(user.role) : undefined
    return await this.updateOrderPaymentUseCase.execute(id, dto.payment, {
      actor,
      actorRole,
    })
  }
}
