import { hashRequest } from '@use-cases/inventory/idempotency.util'

describe('hashRequest', () => {
  it('creates the same hash when object keys are ordered differently', () => {
    expect(hashRequest({ supplier: { name: 'Books', id: 2 } })).toBe(
      hashRequest({ supplier: { id: 2, name: 'Books' } }),
    )
  })

  it('creates different hashes when request values differ', () => {
    expect(hashRequest({ quantity: 2 })).not.toBe(hashRequest({ quantity: 3 }))
  })
})
