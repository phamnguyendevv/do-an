import { Type, applyDecorators } from '@nestjs/common'
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger'

class ResponseFormat<T> {
  @ApiProperty()
  isArray!: boolean
  @ApiProperty()
  path!: string
  @ApiProperty()
  duration!: string
  @ApiProperty()
  method!: string

  data!: T
}

export const ApiResponseType = <TModel extends Type>(
  model: TModel,
  isArray: boolean,
) => {
  return applyDecorators(
    ApiOkResponse({
      isArray: isArray,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseFormat) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
              isArray: {
                type: 'boolean',
                default: isArray,
              },
            },
          },
        ],
      },
    }),
  )
}

export const ApiCreatedResponseType = <TModel extends Type>(
  model: TModel,
  isArray: boolean,
) => {
  return applyDecorators(
    ApiCreatedResponse({
      isArray: isArray,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseFormat) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
              isArray: {
                type: 'boolean',
                default: isArray,
              },
            },
          },
        ],
      },
    }),
  )
}
