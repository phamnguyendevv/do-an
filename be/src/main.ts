import { ValidationPipe, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'
import { USER_REPOSITORY } from '@domain/repositories/user.repository.interface'
import { BCRYPT_SERVICE } from '@domain/services/bcrypt.interface'

import { AppModule } from './app.module'
import { AllExceptionFilter } from './infrastructure/common/filter/exception.filter'
import { LoggingInterceptor } from './infrastructure/common/interceptors/logger.interceptor'
import {
  ResponseFormat,
  ResponseInterceptor,
} from './infrastructure/common/interceptors/response.interceptor'
import { ValidationPipe as CustomValidationPipe } from './infrastructure/common/pipes/validation.pipe'
import { LoggerService } from './infrastructure/logger/logger.service'

async function bootstrap() {
  const env = process.env.NODE_ENV
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  })

  // Security headers with Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // Allows Swagger UI to load scripts/styles in dev
    }),
  )

  // Parse cookies including httpOnly access_token & refresh_token
  app.use(cookieParser())

  app.useGlobalFilters(new AllExceptionFilter(new LoggerService()))

  app.useGlobalPipes(
    new CustomValidationPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  app.useGlobalInterceptors(new LoggingInterceptor(new LoggerService()))
  app.useGlobalInterceptors(new ResponseInterceptor())

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1'],
    prefix: 'api/v',
  })

  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API Docs')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .setVersion('1.0')
      .addServer('https://114c-123-16-7-62.ngrok-free.app')
      .addServer('http://localhost:3000')
      .build()
    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [ResponseFormat],
      deepScanRoutes: true,
    })
    SwaggerModule.setup('api', app, document)
  }

  // Allow credentials for httpOnly cookie support
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
  })

  // Seed demo accounts only for local development.
  try {
    const userRepo = app.get(USER_REPOSITORY)
    const bcrypt = app.get(BCRYPT_SERVICE)
    if (userRepo && bcrypt) {
      const demoAccounts =
        env === 'local'
          ? [
              {
                email: 'admin@example.com',
                username: 'admin',
                password: 'admin123',
                role: UserRoleEnum.Admin,
              },
              {
                email: 'staff@example.com',
                username: 'staff',
                password: 'staff123',
                role: UserRoleEnum.Staff,
              },
              {
                email: 'user@gmail.com',
                username: 'user',
                password: 'password123',
                role: UserRoleEnum.Staff,
              },
            ]
          : []

      for (const account of demoAccounts) {
        const existing = await userRepo.getUserByEmail(account.email)
        if (existing) continue

        const hashed = await bcrypt.hash(account.password)
        await userRepo.createUser({
          email: account.email,
          username: account.username,
          password: hashed,
          confirmPassword: hashed,
          role: account.role,
          status: UserStatusEnum.Active,
          emailVerified: true,
        })
        // eslint-disable-next-line no-console
        console.log(`Seeded local demo account: ${account.email}`)
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('User seeding failed:', err)
  }

  await app.listen(3000)
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Error during bootstrap:', error)
})
