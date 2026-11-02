import { DEFAULT_CHART_FEED_URL } from '../../contracts/chartNode'
import { DEFAULT_FEED_PROXY_URL } from '../../contracts/feedNode'
import { DEFAULT_SYNC_SERVER_URL } from '../sync/serverTransport'

/**
 * A self-hosted Linkhaven server serves the web app itself and announces
 * its services in a `linkhaven-server` meta tag (server/webApp.mjs). The
 * app then uses that server for sync, news feeds and charts by default.
 */
export type HostServer = {
  /** e.g. https://links.example.com */
  origin: string
  sync: boolean
  newsProxy: boolean
  charts: boolean
}

export function readHostServer(
  doc: Document | undefined = typeof document === 'undefined'
    ? undefined
    : document,
  origin = doc?.location?.origin,
): HostServer | null {
  const content = doc
    ?.querySelector('meta[name="linkhaven-server"]')
    ?.getAttribute('content')

  if (!content || !origin || !/^https?:/.test(origin)) {
    return null
  }

  try {
    const services = JSON.parse(content) as Record<string, unknown>

    return {
      origin,
      sync: services.sync === true,
      newsProxy: services.newsProxy === true,
      charts: services.charts === true,
    }
  } catch {
    return null
  }
}

let cached: HostServer | null | undefined

export function getHostServer() {
  if (cached === undefined) {
    cached = readHostServer()
  }

  return cached
}

/**
 * The Linkhaven server that runs a service for this app: the one the web
 * app came from, or else the public server it was built with
 * (VITE_SYNC_SERVER_URL). A self-hosted app with the service off has none.
 */
function serviceOrigin(
  service: 'newsProxy' | 'charts',
  host: HostServer | null,
  publicServer: string,
) {
  if (host) {
    return host[service] ? host.origin : null
  }

  try {
    return publicServer ? new URL(publicServer).origin : null
  } catch {
    return null
  }
}

/** The feed proxy a new news feed starts with. */
export function defaultFeedProxyUrl(
  host = getHostServer(),
  publicServer = DEFAULT_SYNC_SERVER_URL,
) {
  const origin = serviceOrigin('newsProxy', host, publicServer)

  return origin ? `${origin}/rss` : DEFAULT_FEED_PROXY_URL
}

/** The chart feed a new chart starts with. */
export function defaultChartFeedUrl(
  host = getHostServer(),
  publicServer = DEFAULT_SYNC_SERVER_URL,
) {
  const origin = serviceOrigin('charts', host, publicServer)

  return origin
    ? `${origin.replace(/^http/, 'ws')}/feed`
    : DEFAULT_CHART_FEED_URL
}

/**
 * Charts and feeds made before a server was known kept the old placeholder
 * on 127.0.0.1, which nothing answers on most devices (say, after a sync).
 * They use the app's server instead; any other address stays as set.
 */
export function resolveChartFeedUrl(
  url: string,
  host = getHostServer(),
  publicServer = DEFAULT_SYNC_SERVER_URL,
) {
  return url.trim() === DEFAULT_CHART_FEED_URL
    ? defaultChartFeedUrl(host, publicServer)
    : url
}

export function resolveFeedProxyUrl(
  url: string,
  host = getHostServer(),
  publicServer = DEFAULT_SYNC_SERVER_URL,
) {
  return url.trim() === DEFAULT_FEED_PROXY_URL
    ? defaultFeedProxyUrl(host, publicServer)
    : url
}
