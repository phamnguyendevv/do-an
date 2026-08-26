import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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

import { GetListProviderUseCase } from '@use-cases/provider/get-list-provider.use-case'
import { ChangePasswordUseCase } from '@use-cases/users/change-password.use-case'
import { GetListUsersUseCase } from '@use-cases/users/get-list-users.use-case'
import { UpdateUsersUseCase } from '@use-cases/users/update-user.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { ChangePasswordDto } from './dto/change-password.dto'
import { GetListProviderDto } from './dto/get-list-provider.dto'
import { GetListUsersDto } from './dto/get-list-users.dto'
import { AdminUpdateUserDto, UpdateUserDto } from './dto/update-users.dto'
import { SimpleUserPresenter } from './presenters/get-detail-user-presenters'
import { GetListProviderPresenter } from './presenters/get-list-provider.presenters'
import { GetListUserPresenter } from './presenters/get-list-users.presenter'

@Controller()
@ApiTags('Users')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
export class UsersController {
  constructor(
    private readonly getListUserUseCase: GetListUsersUseCase,
    private readonly updateUserUseCase: UpdateUsersUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly getListProviderUseCase: GetListProviderUseCase,
  ) {}

  // ===== ADMIN OPERATIONS =====
  // Admin can manage all users in the system

  @Get('admin/users')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List users for admin ',
    description: 'Only admin can access this endpoint',
  })
  @ApiResponseType(GetListUserPresenter, true)
  @ApiExtraModels(GetListUserPresenter)
  @ApiOkResponse({ type: GetListUserPresenter })
  @CheckPolicies({ action: 'search', subject: 'User' })
  async getAdminUsersList(@Query() querySearchParams: GetListUsersDto) {
    const { data, pagination } =
      await this.getListUserUseCase.execute(querySearchParams)
    return new GetListUserPresenter(data, pagination)
  }

  @Get('admin/users/:id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user by admin',
    description: 'Get user information by admin',
  })
  @ApiOkResponse({ description: 'User found' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @CheckPolicies({ action: 'read', subject: 'User' })
  async getAdminUserDetail(@Param('id', ParseIntPipe) id: number) {
    const users = await this.getListUserUseCase.execute({
      id: id,
    })
    return new SimpleUserPresenter(users.data[0])
  }

  @Put('admin/users/:id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user by admin ',
    description: 'Update role or status or email_verified   a user',
  })
  @ApiOkResponse({ description: 'User updated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @CheckPolicies(
    { action: 'update', subject: 'User', field: 'role' },
    { action: 'update', subject: 'User', field: 'status' },
  )
  async updateAdminUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() adminFields: AdminUpdateUserDto,
  ) {
    const isUpdated = await this.updateUserUseCase.execute(
      { id: id },
      adminFields,
    )
    return isUpdated
  }

  // ===== USER PROFILE OPERATIONS =====
  // Users can manage their own profile

  @Get('users/profile')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile by user',
    description: 'Get user profile information by user',
  })
  @ApiOkResponse({ description: 'User found' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @CheckPolicies({ action: 'read', subject: 'User' })
  async getUserProfile(@User('id') userId: number) {
    const users = await this.getListUserUseCase.execute({
      id: userId,
    })
    return new SimpleUserPresenter(users.data[0])
  }

  @Put('users/profile')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update  user profile by user',
    description: 'Update user profile information',
  })
  @ApiOkResponse({ description: 'User updated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @CheckPolicies({ action: 'update', subject: 'User' })
  async updateUserProfile(
    @Body() updateUserDto: UpdateUserDto,
    @User('id') userId: number,
  ) {
    const isUpdated = await this.updateUserUseCase.execute(
      { id: userId },
      updateUserDto,
    )
    return isUpdated
  }

  @Put('users/change-password')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change user password',
    description: 'Change password of a user',
  })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @CheckPolicies({ action: 'update', subject: 'User', field: 'password' })
  async changeUserPassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @User('id') userId: number,
  ) {
    const isUpdated = await this.changePasswordUseCase.execute(
      { id: userId },
      changePasswordDto,
    )
    return isUpdated
  }

  // ===== PROVIDER OPERATIONS =====
  // Public endpoint for users to browse providers

  @Get('user/provider')
  @ApiOperation({
    summary: 'List users for provider ',
    description: 'Only provider can access this endpoint',
  })
  @ApiResponseType(GetListProviderPresenter, true)
  @ApiExtraModels(GetListProviderPresenter)
  @ApiOkResponse({ type: GetListProviderPresenter })
  @CheckPolicies({ action: 'search', subject: 'User' })
  async getProvidersList(@Query() querySearchParams: GetListProviderDto) {
    const { data, pagination } =
      await this.getListProviderUseCase.execute(querySearchParams)
    return new GetListProviderPresenter(data, pagination)
  }
}
