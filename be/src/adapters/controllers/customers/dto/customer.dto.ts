import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'
<<<<<<< HEAD
import { Transform } from 'class-transformer'
=======
>>>>>>> main

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  phone!: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  note?: string
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  note?: string
}

export class ListCustomersDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
<<<<<<< HEAD
  @Transform(({ value }) => Number(value))
=======
>>>>>>> main
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
<<<<<<< HEAD
  @Transform(({ value }) => Number(value))
=======
>>>>>>> main
  @IsInt()
  @Min(1)
  @Max(500)
  size?: number
}

export class CustomerSummaryQueryDto {
  @IsOptional()
  @IsNumber()
  customerId?: number
}
