import { describe, expect, it } from 'vitest'

import {
  defaultChartFeedUrl,
  defaultFeedProxyUrl,
  readHostServer,
  resolveChartFeedUrl,
  resolveFeedProxyUrl,
} from '../../../../src/features/selfHost/hostServer'

function docWith(content: string | null) {
  const doc = document.implementation.createHTMLDocument('Linkhaven')

  if (content !== null) {
    const meta = doc.createElement('meta')

    meta.name = 'linkhaven-server'
    meta.content = content
    doc.head.append(meta)
  }

  return doc
}

describe('host server', () => {
  it('reads the services a self-hosted server announces', () => {
    const host = readHostServer(
      docWith('{"sync":true,"newsProxy":true,"charts":true}'),
      'https://links.example.com',
    )

    expect(host).toEqual({
      origin: 'https://links.example.com',
      sync: true,
      newsProxy: true,
      charts: true,
    })
    expect(defaultFeedProxyUrl(host)).toBe('https://links.example.com/rss')
    expect(defaultChartFeedUrl(host)).toBe('wss://links.example.com/feed')
  })

  it('falls back to the local defaults elsewhere', () => {
    expect(
      readHostServer(docWith(null), 'https://links.example.com'),
    ).toBeNull()
    expect(
      readHostServer(docWith('not json'), 'https://links.example.com'),
    ).toBeNull()
    // The extension's own pages are no host server.
    expect(
      readHostServer(docWith('{"sync":true}'), 'chrome-extension://abc'),
    ).toBeNull()
    expect(defaultFeedProxyUrl(null)).toBe('http://127.0.0.1:8788/rss')
    expect(
      defaultChartFeedUrl({
        origin: 'http://localhost:8790',
        sync: true,
        newsProxy: false,
        charts: true,
      }),
    ).toBe('ws://localhost:8790/feed')
  })

  it('uses the public server outside a self-hosted app', () => {
    const publicServer = 'https://linkhaven.oli-tech.eu/'

    expect(defaultChartFeedUrl(null, publicServer)).toBe(
      'wss://linkhaven.oli-tech.eu/feed',
    )
    expect(defaultFeedProxyUrl(null, publicServer)).toBe(
      'https://linkhaven.oli-tech.eu/rss',
    )
    // A self-hosted app with charts off doesn't fall back to it.
    expect(
      defaultChartFeedUrl(
        {
          origin: 'https://links.example.com',
          sync: true,
          newsProxy: true,
          charts: false,
        },
        publicServer,
      ),
    ).toBe('ws://127.0.0.1:8787/feed')
  })

  it('points the old local placeholder at the server, keeps own addresses', () => {
    const publicServer = 'https://linkhaven.oli-tech.eu'

    expect(
      resolveChartFeedUrl('ws://127.0.0.1:8787/feed', null, publicServer),
    ).toBe('wss://linkhaven.oli-tech.eu/feed')
    expect(
      resolveFeedProxyUrl('http://127.0.0.1:8788/rss', null, publicServer),
    ).toBe('https://linkhaven.oli-tech.eu/rss')
    expect(
      resolveChartFeedUrl('wss://charts.example.com/feed', null, publicServer),
    ).toBe('wss://charts.example.com/feed')
    expect(resolveFeedProxyUrl('', null, publicServer)).toBe('')
    // No server known: the placeholder stays.
    expect(resolveChartFeedUrl('ws://127.0.0.1:8787/feed', null, '')).toBe(
      'ws://127.0.0.1:8787/feed',
    )
  })
})
