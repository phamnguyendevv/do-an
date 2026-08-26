import { OmitType } from '@nestjs/swagger'

import { ResetPasswordDto } from './reset-password.dto'

export class VerifyOtpDto extends OmitType(ResetPasswordDto, [
  'newPassword',
] as const) {}
