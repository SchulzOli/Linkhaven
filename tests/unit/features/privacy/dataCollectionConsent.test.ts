import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  releaseDataCollection,
  requestDataCollection,
} from '../../../../src/features/privacy/dataCollectionConsent'

const scope = globalThis as { browser?: unknown }

afterEach(() => {
  delete scope.browser
})

function fakeFirefox(granted: boolean) {
  const permissions = {
    request: vi.fn(async () => granted),
    remove: vi.fn(async () => true),
  }

  scope.browser = { permissions, runtime: { getBrowserInfo: () => ({}) } }

  return permissions
}

describe('data collection consent', () => {
  it('asks Firefox for the data a feature sends', async () => {
    const permissions = fakeFirefox(false)

    expect(await requestDataCollection('aiArrangement')).toBe(false)
    expect(permissions.request).toHaveBeenCalledWith({
      data_collection: ['browsingActivity'],
    })

    await releaseDataCollection('deviceSync')
    expect(permissions.remove).toHaveBeenCalledWith({
      data_collection: ['bookmarksInfo'],
    })
  })

  it('asks nothing for other features or other browsers', async () => {
    const permissions = fakeFirefox(false)

    expect(await requestDataCollection('linkCheck')).toBe(true)
    expect(permissions.request).not.toHaveBeenCalled()

    // Chrome/Edge: no getBrowserInfo, no prompt.
    scope.browser = { permissions }
    expect(await requestDataCollection('aiArrangement')).toBe(true)
    expect(permissions.request).not.toHaveBeenCalled()
  })
})
