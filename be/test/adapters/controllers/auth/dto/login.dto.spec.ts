import { validate } from 'class-validator'

import { LoginDto } from '@adapters/controllers/auth/dto/login.dto'

describe('LoginDto', () => {
  let dto: LoginDto

  beforeEach(() => {
    dto = new LoginDto()
  })

  describe('email', () => {
    beforeEach(() => {
      dto.password = 'password'
    })

    it('should validate email property', async () => {
      dto.email = 'user@example.com'

      const errors = await validate(dto)
      expect(errors.length).toEqual(0)
    })

    it('should return an error when email is invalid', async () => {
      dto.email = 'invalid email'
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return an error when email is empty', async () => {
      dto.email = ''
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return an error when email is number', async () => {
      dto.email = 123 as unknown as string
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('password', () => {
    beforeEach(() => {
      dto.email = 'user@example.com'
    })

    it('should validate password property', async () => {
      dto.password = 'password'
      const errors = await validate(dto)
      expect(errors.length).toEqual(0)
    })

    it('should return an error when password is empty', async () => {
      dto.password = ''
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return an error when password is number', async () => {
      dto.password = 123 as unknown as string
      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
    })
  })
})
