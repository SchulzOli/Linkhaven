import { describe, expect, it } from 'vitest'

import { describeLastSync } from '../../../../src/features/sync/syncTime'

describe('last sync', () => {
  const now = Date.parse('2026-11-02T12:00:00Z')

  it('says how long ago, in words', () => {
    expect(describeLastSync(undefined, now)).toBe('not synced yet')
    expect(describeLastSync('2026-11-02T11:59:40Z', now)).toBe('just now')
    expect(describeLastSync('2026-11-02T11:55:00Z', now)).toBe('5 min ago')
    expect(describeLastSync('2026-11-02T09:00:00Z', now)).toBe('3 h ago')
    expect(describeLastSync('2026-10-30T09:00:00Z', now)).toBe(
      new Date('2026-10-30T09:00:00Z').toLocaleDateString(),
    )
  })
})
