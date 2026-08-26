import { Module } from '@nestjs/common'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'

import { EnvironmentConfigModule } from '@infrastructure/config/environment/environment-config.module'
import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'

export const getTypeOrmModuleOptions = (
  config: EnvironmentConfigService,
): TypeOrmModuleOptions =>
  ({
    type: config.getDatabaseEngine(),
    host: config.getDatabaseHost(),
    port: config.getDatabasePort(),
    username: config.getDatabaseUser(),
    password: config.getDatabasePassword(),
    database: config.getDatabaseName(),
    entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
    synchronize: true,
    schema: process.env.DATABASE_SCHEMA,
    migrationsRun: true,
    migrations: [__dirname + '/../../../../database/migrations/**/*{.ts,.js}'],
    subscribers: [__dirname + '/subscribers/**/*{.ts,.js}'],
    logging: config.getNodeEnv() !== 'production',
  }) as TypeOrmModuleOptions

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [EnvironmentConfigModule],
      inject: [EnvironmentConfigService],
      useFactory: getTypeOrmModuleOptions,
    }),
  ],
})
export class TypeOrmConfigModule {}
