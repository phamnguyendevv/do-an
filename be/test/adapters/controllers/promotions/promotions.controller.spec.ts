import { plainToInstance } from 'class-transformer'
import { FindOperator } from 'typeorm'

import { ListPromotionsDto } from '@adapters/controllers/promotions/dto/promotion.dto'
import { PromotionsController } from '@adapters/controllers/promotions/promotions.controller'

describe('PromotionsController', () => {
  it('converts paginated query parameters to numbers', () => {
    const query = plainToInstance(ListPromotionsDto, {
      page: '2',
      size: '100',
    })

    expect(query.page).toBe(2)
    expect(query.size).toBe(100)
  })

  it('lists promotions using partial case-insensitive code/name matching', async () => {
    const repository = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    }
    const controller = new PromotionsController(repository as never)

    await controller.list({
      page: 2,
      size: 100,
      search: ' SaLe ',
    })

    const [options] = repository.findAndCount.mock.calls[0] as [
      {
        where: Array<{ code: FindOperator<string>; name: FindOperator<string> }>
        take: number
        skip: number
      },
    ]
    expect(options.take).toBe(100)
    expect(options.skip).toBe(100)
    expect(options.where).toHaveLength(2)
    expect(options.where[0]?.code).toBeInstanceOf(FindOperator)
    expect(options.where[0]?.code.value).toBe('%SaLe%')
    expect(options.where[1]?.name.value).toBe('%SaLe%')
  })

  it('returns all records when search is blank', async () => {
    const repository = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    }
    const controller = new PromotionsController(repository as never)

    await controller.list({ search: '   ' })

    expect(repository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, take: 50, skip: 0 }),
    )
  })
})
