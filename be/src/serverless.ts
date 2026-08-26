import { VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import serverlessExpress from '@codegenie/serverless-express'
import { Callback, Context, Handler } from 'aws-lambda'
import cookieParser from 'cookie-parser'
import { RequestListener } from 'http'

import { AppModule } from './app.module'
import { AllExceptionFilter } from './infrastructure/common/filter/exception.filter'
import { LoggingInterceptor } from './infrastructure/common/interceptors/logger.interceptor'
import {
  ResponseFormat,
  ResponseInterceptor,
} from './infrastructure/common/interceptors/response.interceptor'
import { ValidationPipe } from './infrastructure/common/pipes/validation.pipe'
import { LoggerService } from './infrastructure/logger/logger.service'

let server: Handler | undefined

async function bootstrap() {
  const env = process.env.NODE_ENV
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.use(cookieParser())

  // Register global exception filter
  app.useGlobalFilters(new AllExceptionFilter(new LoggerService()))

  // Register global pipes
  app.useGlobalPipes(new ValidationPipe())

  // Register global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(new LoggerService()))
  app.useGlobalInterceptors(new ResponseInterceptor())

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1'],
    prefix: 'api/v',
  })

  // Configure Swagger for API documentation
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .addBearerAuth()
      .setVersion('1.0')
      .build()
    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [ResponseFormat],
      deepScanRoutes: true,
    })
    SwaggerModule.setup('api', app, document)
  }

  await app.init()

  const expressApp = app.getHttpAdapter().getInstance()
  return serverlessExpress({ app: expressApp as RequestListener })
}

// AWS Lambda handler
export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
): Promise<Handler> => {
  server = server ?? (await bootstrap())
  return server(event, context, callback)
}
