import { DataSource } from 'typeorm'

import { CreateImportReceiptUseCase } from '@use-cases/inventory/create-import-receipt.use-case'

import { Book } from '@infrastructure/databases/postgresql/entities/book.entity'
import { ImportReceipt } from '@infrastructure/databases/postgresql/entities/import-receipt.entity'

describe('CreateImportReceiptUseCase idempotency', () => {
  it('returns the original receipt without applying stock changes twice', async () => {
    let savedReceipt: ImportReceipt | undefined
    const book = {
      id: 12,
      title: 'Book',
      stock: 5,
      minStock: 1,
      purchasePrice: 10,
      status: undefined,
    }
    const manager = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(async (entity: unknown) =>
        entity === ImportReceipt ? savedReceipt : entity === Book ? book : null,
      ),
      create: jest.fn(
        (_entity: unknown, value: Record<string, unknown>) => value,
      ),
      save: jest.fn(async (entity: unknown, value: Record<string, unknown>) => {
        if (entity === ImportReceipt) {
          savedReceipt = { id: 1, ...value } as unknown as ImportReceipt
          return savedReceipt
        }
        return value
      }),
    }
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn(),
      manager,
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    }
    const service = new CreateImportReceiptUseCase(
      {} as never,
      {} as never,
      {} as never,
      {
        badRequestException: (error: Error) => error,
        notFoundException: (error: Error) => error,
      } as never,
      { delPattern: jest.fn() } as never,
      {
        createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      } as unknown as DataSource,
    )
    const input = {
      idempotencyKey: 'bb4fc5e4-8e33-4cd7-921a-6c2b9cb14d28',
      createdById: 7,
      supplierName: 'Supplier',
      lines: [{ bookId: 12, quantity: 2, price: 10 }],
    }

    const first = await service.execute(input)
    const second = await service.execute(input)

    expect(second).toBe(first)
    expect(book.stock).toBe(7)
    expect(
      manager.save.mock.calls.filter(([entity]) => entity === ImportReceipt),
    ).toHaveLength(1)
    expect(queryRunner.query).toHaveBeenCalledTimes(2)
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(2)
  })
})
