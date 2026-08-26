import 'reflect-metadata'

import { validate } from '@infrastructure/config/environment/environment-config.validation'

const config: { [key: string]: unknown } = {
  NODE_ENV: 'local',
  DATABASE_ENGINE: 'postgres',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_NAME: 'postgres',
  DATABASE_SCHEMA: 'public',
  DATABASE_SYNCHRONIZE: false,
  AWS_COGNITO_USER_POOL_ID: 'us-east-1_1X2X3X4X5X6',
  AWS_COGNITO_CLIENT_ID: '1X2X3X4X5X6X7X8X9X0X',
  AWS_COGNITO_AUTHORITY_URL:
    'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_1X2X3X4X5X6',
  AWS_REGION: 'us-east-1',
}

describe('EnvironmentVariables validation', () => {
  it('should not throw error for valid config', () => {
    expect(() => validate(config)).not.toThrow()
  })

  it('should throw error for invalid config', () => {
    const config = {
      NODE_ENV: 'invalid',
    }
    expect(() => validate(config)).toThrow()
  })

  const keys = [
    'NODE_ENV',
    'DATABASE_ENGINE',
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'DATABASE_SCHEMA',
    'DATABASE_SYNCHRONIZE',
    'AWS_COGNITO_USER_POOL_ID',
    'AWS_COGNITO_CLIENT_ID',
    'AWS_COGNITO_AUTHORITY_URL',
    'AWS_REGION',
  ]

  keys.forEach((key) => {
    it(`should throw error when ${key} is missing`, () => {
      delete config[key]
      expect(() => validate(config)).toThrow()
    })
  })
})
