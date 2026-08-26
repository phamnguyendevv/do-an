import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

import { EnvironmentConfigService } from '@infrastructure/config/environment/environment-config.service'

describe('EnvironmentConfigService', () => {
  let service: EnvironmentConfigService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<EnvironmentConfigService>(EnvironmentConfigService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should return the correct NODE_ENV value', () => {
    const expectedValue = 'local'
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getNodeEnv()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('NODE_ENV')
  })

  it('should return the correct DATABASE_ENGINE value', () => {
    const expectedValue = 'postgres'
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getDatabaseEngine()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('DATABASE_ENGINE')
  })

  it('should return the correct DATABASE_HOST value', () => {
    const expectedValue = 'localhost'
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getDatabaseHost()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('DATABASE_HOST')
  })

  it('should return the correct DATABASE_PORT value', () => {
    const expectedValue = 5432
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getDatabasePort()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('DATABASE_PORT')
  })

  it('should return the correct DATABASE_USER value', () => {
    const expectedValue = 'admin'
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getDatabaseUser()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('DATABASE_USER')
  })

  it('should return the correct DATABASE_PASSWORD value', () => {
    const expectedValue = 'password'
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getDatabasePassword()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('DATABASE_PASSWORD')
  })

  it('should return the correct DATABASE_NAME value', () => {
    const expectedValue = 'test'
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getDatabaseName()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('DATABASE_NAME')
  })

  it('should return the correct DATABASE_SCHEMA value', () => {
    const expectedValue = 'public'
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getDatabaseSchema()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('DATABASE_SCHEMA')
  })

  it('should return the correct DATABASE_SYNCHRONIZE value', () => {
    const expectedValue = true
    jest.spyOn(configService, 'get').mockReturnValueOnce(expectedValue)

    const result = service.getDatabaseSync()

    expect(result).toBe(expectedValue)
    expect(configService.get).toHaveBeenCalledWith('DATABASE_SYNCHRONIZE')
  })
})
