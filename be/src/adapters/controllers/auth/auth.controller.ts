import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { Response } from 'express'

import { LoginOauthUseCase } from '@use-cases/auth/login-oauth.use-case'
import { LoginUseCase } from '@use-cases/auth/login.use-case'
import { RefreshUseCase } from '@use-cases/auth/refresh.use-case'
import { RegisterUseCase } from '@use-cases/auth/register.use-case'
import { SendVerifyEmailUseCase } from '@use-cases/auth/send-verify-email.use-case'
import { VerifyEmailUseCase } from '@use-cases/auth/verify-email.use-case'
import { CreateProviderUseCase } from '@use-cases/provider/create-provider.use-case'
import { ForgotPasswordUseCase } from '@use-cases/users/forgot-password.use-case'
import { ResetPasswordUseCase } from '@use-cases/users/reset-password.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { GoogleOauthGuard } from '../common/guards/google-oauth.guard'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import JwtRefreshGuard from '../common/guards/jwt-refresh.guard'
import { RegisterProviderDto } from '../users/dto/create-provider.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { SendVerifyEmailDto } from './dto/send-verify-email.dto'
import { VerifyOtpDto } from './dto/verify-email.dto'
import { GetMePresenter } from './presenters/get-me.presenter'
import { LoginPresenter, TokenPresenter } from './presenters/login.presenter'
import { RefreshPresenter } from './presenters/refresh.presenter'
import { RegisterPresenter } from './presenters/register.presenter'

@Controller('auth')
@ApiTags('Auth')
@ApiResponse({ status: 400, description: 'Bad request' })
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUsseCase: ResetPasswordUseCase,
    private readonly loginOauthUseCase: LoginOauthUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly sendVerifyEmailUseCase: SendVerifyEmailUseCase,
    private readonly createProviderUseCase: CreateProviderUseCase,
  ) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOperation({ summary: 'Login', description: 'Login a user' })
  @ApiExtraModels(LoginPresenter)
  @ApiResponseType(LoginPresenter, false)
  async login(@Body() loginDto: LoginDto) {
    const { user, tokens } = await this.loginUseCase.execute(loginDto)
    return new LoginPresenter(
      new GetMePresenter(user),
      new TokenPresenter(tokens),
    )
  }

  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiOperation({
    summary: 'Register',
    description:
      'Register a user ( user name có thể không truyền nên, role( 1 là admin, 2 là provider, 3 là client) mặc định là client và status(1 là ative, 2 là inactive, 3 là pending, 4 là banned) mặc định là inactive và emailVerified mặc định là false) ',
  })
  @ApiExtraModels(RegisterPresenter)
  @ApiResponseType(RegisterPresenter, false)
  async register(@Body() registerDto: RegisterDto) {
    const tokens = await this.registerUseCase.execute(registerDto)
    return new RegisterPresenter(tokens)
  }

  @Post('register/provider')
  @ApiOperation({
    summary: ' Create provider',
    description: 'Create provider account with business information',
  })
  @ApiOkResponse({ description: 'register provider successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @CheckPolicies({ action: 'create', subject: 'User' })
  async updateUserProvider(@Body() registerProviderDto: RegisterProviderDto) {
    const isUpdated =
      await this.createProviderUseCase.execute(registerProviderDto)
    return isUpdated
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get new tokens',
    description: 'Get new access and refresh tokens using refresh token',
  })
  @ApiExtraModels(RefreshPresenter)
  @ApiResponseType(RefreshPresenter, false)
  async refresh(@User('id') userId: number) {
    const tokens = await this.refreshUseCase.execute({ userId })

    return new RefreshPresenter(tokens)
  }

  @Get('fogot-password')
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Send email to reset password',
  })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal error' })
  forgotPassword(@Query('email') email: string) {
    const result = this.forgotPasswordUseCase.execute(email)
    return result
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using reset token',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal error' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = this.resetPasswordUsseCase.execute(resetPasswordDto)
    return result
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email',
    description: 'Verify user email using verification token',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal error' })
  verifyEmail(@Body() verifyOtpDto: VerifyOtpDto) {
    const isVerified = this.verifyEmailUseCase.execute(verifyOtpDto)
    return isVerified
  }

  @Post('send-verify-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send verify email',
    description: 'Send verification email to the user',
  })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal error' })
  async sendVerifyEmail(@Body() sendVerifyEmailDto: SendVerifyEmailDto) {
    const isSent = await this.sendVerifyEmailUseCase.execute(
      sendVerifyEmailDto.email,
    )
    return isSent
  }

  @Get('google')
  @UseGuards(GoogleOauthGuard)
  async auth() {}

  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  @ApiOperation({
    summary: 'Google OAuth callback',
    description: 'Callback endpoint for Google OAuth authentication',
  })
  @ApiResponse({
    status: 200,
    description: 'User authenticated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async googleAuthCallback(
    @User() user: { email: string; name: string },
    @Res() res: Response,
  ) {
    const tokens = await this.loginOauthUseCase.execute(user)

    res.redirect(tokens.url)
  }
}
