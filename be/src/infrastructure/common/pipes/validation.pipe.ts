import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common'

import { plainToClass } from 'class-transformer'
import { ValidationError, validate } from 'class-validator'

interface IValidationError {
  property: string
  errors: string[]
  constraints?: {
    [type: string]: string
  }
}

/**
 * Validation Pipe.
 * Gets Validation errors and creates custom error messages
 */
@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  async transform(value: unknown, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value
    }
    const object = plainToClass(metatype as new () => unknown, value)
    const errors = await validate(object as object)
    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors))
    }
    return value
  }

  private toValidate(metatype: unknown): boolean {
    const types: unknown[] = [String, Boolean, Number, Array, Object]
    return !types.includes(metatype)
  }

  private formatErrors(errors: ValidationError[]): IValidationError[] {
    return errors.map((err) => {
      return {
        property: err.property,
        errors: err.constraints ? Object.keys(err.constraints) : [],
        constraints: err.constraints,
      }
    })
  }
}
