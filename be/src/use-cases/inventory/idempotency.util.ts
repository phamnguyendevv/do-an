import { createHash } from 'crypto'

export function hashRequest(value: unknown): string {
  const canonical =
    JSON.stringify(value, (_key, item: unknown) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        return item
      }

      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).sort(
          ([left], [right]) => left.localeCompare(right),
        ),
      )
    }) ?? 'null'

  return createHash('sha256').update(canonical).digest('hex')
}
