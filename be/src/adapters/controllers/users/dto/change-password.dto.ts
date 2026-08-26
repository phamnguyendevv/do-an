import { ApiProperty } from '@nestjs/swagger'

import { IsNotEmpty, IsString } from 'class-validator'

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Old password of the user',
    example: 'OldPassword123',
  })
  @IsNotEmpty()
  @IsString()
  oldPassword!: string

  @ApiProperty({
    description: 'New password of the user',
    example: 'NewPassword123',
  })
  @IsNotEmpty()
  @IsString()
  password!: string

  @ApiProperty({
    description: 'Confirm new password of the user',
    example: 'NewPassword123',
  })
  @IsNotEmpty()
  @IsString()
  confirmPassword!: string
}
