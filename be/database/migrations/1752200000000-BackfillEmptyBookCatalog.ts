import { MigrationInterface, QueryRunner } from 'typeorm'

import { SeedBooksCategoriesSuppliers1752000000000 } from './1752000000000-SeedBooksCategoriesSuppliers'

export class BackfillEmptyBookCatalog1752200000000
  implements MigrationInterface
{
  name = 'BackfillEmptyBookCatalog1752200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('books'))) return

    const [{ count }] = (await queryRunner.query(
      'SELECT COUNT(*)::int AS count FROM "books"',
    )) as Array<{ count: number }>
    if (count !== 0) return

    await new SeedBooksCategoriesSuppliers1752000000000().up(queryRunner)
  }

  public async down(): Promise<void> {
    // Keep seeded catalog data when rolling back schema changes.
  }
}
