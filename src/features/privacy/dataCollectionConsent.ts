import type { NetworkFeatureKey } from '../../contracts/networkFeatures'

/**
 * Firefox asks before an extension sends user data anywhere (manifest
 * `data_collection_permissions`). Two optional features do: the AI
 * arrangement sends page titles and addresses to the Anthropic API, and
 * device sync uploads the (encrypted) boards. Turning one on asks Firefox
 * for that kind of data; turning it off gives it back. Chrome, Edge and the
 * web app have no such prompt.
 */
const DATA_COLLECTION: Partial<Record<NetworkFeatureKey, string>> = {
  aiArrangement: 'browsingActivity',
  deviceSync: 'bookmarksInfo',
}

type FirefoxPermissions = {
  request: (permissions: { data_collection: string[] }) => Promise<boolean>
  remove: (permissions: { data_collection: string[] }) => Promise<boolean>
}

function getFirefoxPermissions(): FirefoxPermissions | null {
  const scope = globalThis as {
    browser?: {
      permissions?: FirefoxPermissions
      runtime?: { getBrowserInfo?: unknown }
    }
  }

  // getBrowserInfo exists only in Firefox.
  return typeof scope.browser?.runtime?.getBrowserInfo === 'function'
    ? (scope.browser.permissions ?? null)
    : null
}

/**
 * Asks for the data a feature sends, where the browser wants that. Must run
 * straight from the click that turns the feature on.
 */
export async function requestDataCollection(key: NetworkFeatureKey) {
  const category = DATA_COLLECTION[key]
  const permissions = getFirefoxPermissions()

  if (!category || !permissions) {
    return true
  }

  try {
    return await permissions.request({ data_collection: [category] })
  } catch {
    // A Firefox without data collection permissions: nothing to ask.
    return true
  }
}

export async function releaseDataCollection(key: NetworkFeatureKey) {
  const category = DATA_COLLECTION[key]
  const permissions = getFirefoxPermissions()

  if (!category || !permissions) {
    return
  }

  try {
    await permissions.remove({ data_collection: [category] })
  } catch {
    // Already gone.
  }
}
