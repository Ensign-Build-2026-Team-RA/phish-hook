import { vi } from 'vitest'

export function mockEmailStorage() {
  const values = new Map()
  return {
    values,
    put: vi.fn(async (key, value) => { values.set(key, JSON.parse(value)) }),
    get: vi.fn(async key => values.get(key) ?? null),
    delete: vi.fn(async key => { values.delete(key) }),
  }
}
