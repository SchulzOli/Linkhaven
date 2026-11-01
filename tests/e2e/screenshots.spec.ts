/**
 * Playwright script to generate the promotional screenshots for the browser
 * extension store listings (AMO / Chrome Web Store / Edge Add-ons) and the
 * project website.
 *
 * Screenshots are saved to: extension/screenshots/
 *
 * Run (opt-in, skipped in the regular suite and CI):
 *   STORE_SCREENSHOTS=1 npx playwright test screenshots --project=chromium
 *
 * Chart and feed data are mocked. Link cards load the real site favicons on
 * purpose, so the store images show the real product.
 *
 * Prerequisites:
 *   Dev server running on http://127.0.0.1:4173 (Playwright auto-starts it)
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, test, type Locator, type Page } from '@playwright/test'

// @ts-expect-error -- plain ESM server module without type declarations
import {
  createLinkhavenServer,
  readServerConfig,
} from '../../server/linkhaven-server.mjs'

import { moveElementToPoint } from './dragHelpers'
import { dismissVisibleEditPanels, enableNetworkFeatures } from './fixtures'

// ── Viewport: 1280×800 at 1x - the exact size Chrome, Edge and AMO accept ──
const VIEWPORT = { width: 1280, height: 800 }
const SCREENSHOT_DIR = 'extension/screenshots'

test.use({ deviceScaleFactor: 1, viewport: VIEWPORT })

const CHART_FEED_URL = 'ws://127.0.0.1:8787/feed'
const FEED_PROXY_URL = 'http://127.0.0.1:8788/rss'
const NOW = Date.UTC(2026, 9, 2, 15, 30)
const DAY = 86_400_000

/** Deterministic random walk so every run renders the same chart. */
function createSeries(seed: number, start: number, drift: number) {
  let value = start
  let state = seed

  return Array.from({ length: 260 }, (_, index) => {
    state = (state * 16807) % 2147483647
    value *= 1 + drift + (state / 2147483647 - 0.5) * 0.035

    return [NOW - (259 - index) * DAY, Math.round(value * 100) / 100]
  })
}

const CHART_SERIES: Record<
  string,
  { name: string; currency: string; seed: number; start: number; drift: number }
> = {
  AAPL: {
    name: 'Apple Inc.',
    currency: 'USD',
    seed: 11,
    start: 182,
    drift: 0.0011,
  },
  'SAP.DE': {
    name: 'SAP SE',
    currency: 'EUR',
    seed: 29,
    start: 168,
    drift: 0.0016,
  },
  '^GDAXI': {
    name: 'DAX',
    currency: 'EUR',
    seed: 47,
    start: 18200,
    drift: 0.0008,
  },
}

/** Stands in for `npm run feed:charts` with a fixed, realistic series. */
async function mockChartFeed(page: Page) {
  await page.routeWebSocket(CHART_FEED_URL, (ws) => {
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw))

      if (message.type !== 'subscribe') {
        return
      }

      const series = CHART_SERIES[message.symbol] ?? CHART_SERIES.AAPL

      ws.send(
        JSON.stringify({
          type: 'snapshot',
          id: message.id,
          symbol: message.symbol,
          range: message.range,
          currency: series.currency,
          name: series.name,
          points: createSeries(series.seed, series.start, series.drift),
        }),
      )
    })
  })
}

const NEWS_ITEMS = [
  [
    'Open-source browser engines agree on a shared canvas API',
    'Tech Daily',
    0.4,
  ],
  ['Central bank holds rates steady, signals patience', 'Markets Wire', 1.2],
  ['New study maps how people organise their bookmarks', 'Research Notes', 2.5],
  ['Rail network adds night trains between five capitals', 'Europe Today', 3.1],
  ['Chipmakers report strong demand for edge AI hardware', 'Tech Daily', 5.6],
  ['City council approves car-free old town on weekends', 'Europe Today', 7.9],
  ['Why local-first software is having a moment', 'Research Notes', 11.4],
  [
    'Quarterly earnings: software stocks lead the rebound',
    'Markets Wire',
    14.2,
  ],
] as const

function createRss(title: string) {
  const items = NEWS_ITEMS.filter(([, source]) => source === title)
    .map(
      ([headline, , hoursAgo], index) => `<item><title>${headline}</title>
<link>https://news.example/${encodeURIComponent(title)}/${index}</link>
<guid>https://news.example/${encodeURIComponent(title)}/${index}</guid>
<pubDate>${new Date(Date.now() - hoursAgo * 3_600_000).toUTCString()}</pubDate>
<description>${headline}.</description></item>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
<title>${title}</title><link>https://news.example/</link>${items}</channel></rss>`
}

/** Stands in for `npm run feed:news`: four fixed feeds. */
async function mockFeedProxy(page: Page) {
  await page.route(`${FEED_PROXY_URL}?**`, async (route) => {
    const target = new URL(route.request().url()).searchParams.get('url') ?? ''
    const title = decodeURIComponent(target.split('/').at(-1) ?? '')

    await route.fulfill({
      contentType: 'application/rss+xml',
      body: createRss(title),
    })
  })
}

// ── Helpers ──────────────────────────────────────────────────────

async function clearAppState(page: Page) {
  await page.evaluate(async () => {
    window.localStorage.clear()
    await window.indexedDB.deleteDatabase('linkhub')
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
}

async function createCard(page: Page, url: string, title: string) {
  const cards = page.getByTestId(/link-card-/)
  const nextCount = (await cards.count()) + 1

  await page
    .getByRole('button', { name: /Add link|Open quick add/ })
    .first()
    .click()
  await page.getByLabel('Link URL').fill(url)
  await page.getByLabel('Link title').fill(title)
  await page.getByRole('button', { name: 'Create' }).click({ force: true })
  await expect(cards).toHaveCount(nextCount)
  await expect(page.getByTestId('card-edit-panel')).toBeVisible()
  await dismissVisibleEditPanels(page)
}

async function createGroup(page: Page) {
  const groups = page.locator('article[data-testid^="card-group-"]')
  const nextCount = (await groups.count()) + 1

  await page.getByRole('button', { name: 'Add group' }).click()
  await expect(groups).toHaveCount(nextCount)
  await expect(page.getByTestId('group-edit-panel')).toHaveCount(0)
}

async function openMenu(page: Page) {
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function closeMenu(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
}

async function applyTheme(page: Page, themeName: string) {
  await page.getByRole('tab', { name: 'Themes' }).click()
  await page.getByRole('button', { name: `Apply ${themeName} theme` }).click()
  await page.waitForTimeout(300)
}

async function selectOption(
  page: Page,
  label: string | RegExp,
  optionLabel: string,
) {
  const trigger = page.getByLabel(label)
  await trigger.click()
  await page.getByRole('option', { name: optionLabel, exact: true }).click()
  await page.waitForTimeout(150)
}

/** Move an element using dispatchEvent (like existing E2E tests). */
async function moveCardToPoint(
  page: Page,
  element: Locator,
  target: { x: number; y: number },
) {
  await moveElementToPoint(page, element, target, { settleMs: 200 })
}

async function moveCardIntoGroupSlot(
  page: Page,
  card: Locator,
  groupBody: Locator,
  slot: { column: number; row: number },
) {
  const cardBox = await card.boundingBox()
  const groupBodyBox = await groupBody.boundingBox()

  if (!cardBox || !groupBodyBox) {
    throw new Error('missing geometry while placing a card inside a group')
  }

  const padding = 16
  const gap = 14
  const insetX = cardBox.width / 2 + padding
  const insetY = cardBox.height / 2 + padding
  const maxX = Math.max(
    insetX,
    groupBodyBox.width - cardBox.width / 2 - padding,
  )
  const maxY = Math.max(
    insetY,
    groupBodyBox.height - cardBox.height / 2 - padding,
  )
  const slotX = insetX + slot.column * (cardBox.width + gap)
  const slotY = insetY + slot.row * (cardBox.height + gap)

  await moveElementToPoint(
    page,
    card,
    {
      x: groupBodyBox.x + Math.max(insetX, Math.min(maxX, slotX)),
      y: groupBodyBox.y + Math.max(insetY, Math.min(maxY, slotY)),
    },
    {
      pointerDownMethod: 'mouse',
      settleMs: 100,
      sourcePosition: 'center',
      steps: 4,
    },
  )
}

async function screenshot(page: Page, name: string) {
  await page.waitForTimeout(600)
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: false,
  })
}

// ── Test Suite ───────────────────────────────────────────────────

test.describe('Store listing screenshots', () => {
  // Opt-in: these tests rewrite committed store assets and load real site
  // favicons, so the regular suite and CI skip them.
  test.skip(
    !process.env.STORE_SCREENSHOTS,
    'set STORE_SCREENSHOTS=1 to regenerate the store assets',
  )
  // Store assets are desktop images; the mobile project would overwrite them
  // with a scaled, mobile-emulated layout.
  test.skip(
    ({ isMobile }) => isMobile,
    'store screenshots are generated on the desktop project only',
  )
  test.beforeEach(async ({ page }) => {
    // The store assets show charts, feeds and real favicons, which are off
    // by default (Menu → Privacy). The init script re-applies this after
    // clearAppState empties localStorage.
    await enableNetworkFeatures(page, {
      chartsAndFeeds: true,
      siteFavicons: true,
      googleFavicons: true,
    })
    await page.goto('/')
    await clearAppState(page)
  })

  /**
   * Screenshot 1: Large grouped link collection across the canvas
   * Shows: Five named groups with fifty visible nodes to demonstrate scale
   */
  test('01 — Canvas overview with link cards', async ({ page }) => {
    test.slow()
    test.setTimeout(180_000)

    await openMenu(page)
    await applyTheme(page, 'Sunset')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Light')
    await page.getByLabel('Default width').fill('2')
    await page.getByLabel('Default height').fill('2')
    await page.getByLabel('Default show title').uncheck()
    await closeMenu(page)

    const groupConfigs = [
      {
        name: 'Development',
        position: { x: 56, y: 84 },
        cards: [
          { url: 'github.com', title: 'GitHub' },
          { url: 'stackoverflow.com', title: 'Stack Overflow' },
          { url: 'npmjs.com', title: 'npm' },
          { url: 'gitlab.com', title: 'GitLab' },
          { url: 'codepen.io', title: 'CodePen' },
          { url: 'developer.mozilla.org', title: 'MDN' },
          { url: 'figma.com', title: 'Figma' },
          { url: 'notion.so', title: 'Notion' },
          { url: 'vercel.com', title: 'Vercel' },
          { url: 'linear.app', title: 'Linear' },
        ],
      },
      {
        name: 'Research',
        position: { x: 410, y: 84 },
        cards: [
          { url: 'wikipedia.org', title: 'Wikipedia' },
          { url: 'arxiv.org', title: 'arXiv' },
          { url: 'scholar.google.com', title: 'Scholar' },
          { url: 'archive.org', title: 'Archive' },
          { url: 'researchgate.net', title: 'ResearchGate' },
          { url: 'pubmed.ncbi.nlm.nih.gov', title: 'PubMed' },
          { url: 'nature.com', title: 'Nature' },
          { url: 'semanticscholar.org', title: 'Semantic Scholar' },
          { url: 'jstor.org', title: 'JSTOR' },
          { url: 'docs.python.org', title: 'Python Docs' },
        ],
      },
      {
        name: 'Media',
        position: { x: 764, y: 84 },
        cards: [
          { url: 'youtube.com', title: 'YouTube' },
          { url: 'spotify.com', title: 'Spotify' },
          { url: 'twitch.tv', title: 'Twitch' },
          { url: 'netflix.com', title: 'Netflix' },
          { url: 'letterboxd.com', title: 'Letterboxd' },
          { url: 'soundcloud.com', title: 'SoundCloud' },
          { url: 'vimeo.com', title: 'Vimeo' },
          { url: 'disneyplus.com', title: 'Disney+' },
          { url: 'primevideo.com', title: 'Prime Video' },
          { url: 'audible.com', title: 'Audible' },
        ],
      },
      {
        name: 'Workflow',
        position: { x: 230, y: 394 },
        cards: [
          { url: 'slack.com', title: 'Slack' },
          { url: 'atlassian.com/software/jira', title: 'Jira' },
          { url: 'trello.com', title: 'Trello' },
          { url: 'asana.com', title: 'Asana' },
          { url: 'clickup.com', title: 'ClickUp' },
          { url: 'miro.com', title: 'Miro' },
          { url: 'loom.com', title: 'Loom' },
          { url: 'zoom.us', title: 'Zoom' },
          { url: 'drive.google.com', title: 'Drive' },
          { url: 'dropbox.com', title: 'Dropbox' },
        ],
      },
      {
        name: 'Discover',
        position: { x: 584, y: 394 },
        cards: [
          { url: 'reddit.com', title: 'Reddit' },
          { url: 'news.ycombinator.com', title: 'Hacker News' },
          { url: 'producthunt.com', title: 'Product Hunt' },
          { url: 'dribbble.com', title: 'Dribbble' },
          { url: 'behance.net', title: 'Behance' },
          { url: 'webflow.com', title: 'Webflow' },
          { url: 'framer.com', title: 'Framer' },
          { url: 'stripe.com', title: 'Stripe' },
          { url: 'paypal.com', title: 'PayPal' },
          { url: 'etsy.com', title: 'Etsy' },
        ],
      },
    ]

    for (const [groupIndex, groupConfig] of groupConfigs.entries()) {
      await createGroup(page)

      const group = page
        .locator('article[data-testid^="card-group-"]')
        .nth(groupIndex)

      await group.getByRole('button', { name: 'Update group' }).click({
        force: true,
      })
      await expect(page.getByTestId('group-edit-panel')).toBeVisible()
      await page.getByLabel(/Edit group name/).fill(groupConfig.name)
      await page.getByLabel(/Edit group width for/).fill('18')
      await page.getByLabel(/Edit group height for/).fill('10')
      await dismissVisibleEditPanels(page)

      await moveCardToPoint(
        page,
        group.getByTestId(/card-group-header-/),
        groupConfig.position,
      )

      const groupBody = page.getByTestId(/card-group-body-/).nth(groupIndex)

      for (const [cardIndex, cardConfig] of groupConfig.cards.entries()) {
        await createCard(page, cardConfig.url, cardConfig.title)
        await moveCardIntoGroupSlot(
          page,
          page.getByTestId(/link-card-/).last(),
          groupBody,
          {
            column: cardIndex % 5,
            row: Math.floor(cardIndex / 5),
          },
        )
      }
    }

    await page.mouse.click(1160, 690)
    await page.waitForTimeout(200)

    await screenshot(page, '01-canvas-overview')
  })

  /**
   * Screenshot 2: Groups with multiple nested cards
   * Shows: A primary group with five visible nodes plus a secondary group
   */
  test('02 — Groups organizing cards', async ({ page }) => {
    await openMenu(page)
    await applyTheme(page, 'Blueprint')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Light')
    await closeMenu(page)

    // Create first group
    await createGroup(page)
    const group1 = page.locator('article[data-testid^="card-group-"]').first()
    await moveCardToPoint(page, group1.getByTestId(/card-group-header-/), {
      x: 180,
      y: 160,
    })

    // Name the group via edit panel
    await group1
      .getByRole('button', { name: 'Update group' })
      .click({ force: true })
    await expect(page.getByTestId('group-edit-panel')).toBeVisible()
    await page.getByLabel(/Edit group name/).fill('Development')
    await page.getByLabel(/Edit group width for/).fill('18')
    await page.getByLabel(/Edit group height for/).fill('15')
    await dismissVisibleEditPanels(page)

    const group1Body = page.getByTestId(/card-group-body-/).first()

    const developmentCards = [
      { url: 'github.com', title: 'GitHub', slot: { column: 0, row: 0 } },
      {
        url: 'stackoverflow.com',
        title: 'Stack Overflow',
        slot: { column: 1, row: 0 },
      },
      {
        url: 'notion.so',
        title: 'Notion',
        slot: { column: 2, row: 0 },
      },
      {
        url: 'developer.mozilla.org',
        title: 'MDN Web Docs',
        slot: { column: 0, row: 1 },
      },
      { url: 'figma.com', title: 'Figma', slot: { column: 1, row: 1 } },
    ]

    for (const link of developmentCards) {
      await createCard(page, link.url, link.title)
      await moveCardIntoGroupSlot(
        page,
        page.getByTestId(/link-card-/).last(),
        group1Body,
        link.slot,
      )
      await dismissVisibleEditPanels(page)
    }

    // Create second group
    await createGroup(page)
    const group2 = page.locator('article[data-testid^="card-group-"]').last()
    await moveCardToPoint(
      page,
      group2.getByTestId(/card-group-header-/).last(),
      {
        x: 620,
        y: 160,
      },
    )

    await group2
      .getByRole('button', { name: 'Update group' })
      .click({ force: true })
    await expect(page.getByTestId('group-edit-panel')).toBeVisible()
    await page.getByLabel(/Edit group name/).fill('Social')
    await page.getByLabel(/Edit group width for/).fill('13')
    await page.getByLabel(/Edit group height for/).fill('8')
    await dismissVisibleEditPanels(page)

    const group2Body = page.getByTestId(/card-group-body-/).last()

    const socialCards = [
      { url: 'reddit.com', title: 'Reddit', slot: { column: 0, row: 0 } },
      { url: 'youtube.com', title: 'YouTube', slot: { column: 1, row: 0 } },
    ]

    for (const link of socialCards) {
      await createCard(page, link.url, link.title)
      await moveCardIntoGroupSlot(
        page,
        page.getByTestId(/link-card-/).last(),
        group2Body,
        link.slot,
      )
      await dismissVisibleEditPanels(page)
    }

    await page.mouse.click(1100, 620)
    await page.waitForTimeout(250)

    await screenshot(page, '02-groups-organization')
  })

  /**
   * Screenshot 3: Theme & appearance customization (menu open)
   * Shows: Theme tab open with all available themes, styled canvas behind
   */
  test('03 — Theme customization panel', async ({ page }) => {
    // Create cards first (before switching theme — avoids taskbar overlap issues)
    await createCard(page, 'github.com', 'GitHub')
    await createCard(page, 'spotify.com', 'Spotify')
    await createCard(page, 'discord.com', 'Discord')

    const cards = page.getByTestId(/link-card-/)
    await moveCardToPoint(page, cards.nth(0), { x: 120, y: 200 })
    await moveCardToPoint(page, cards.nth(1), { x: 280, y: 200 })
    await moveCardToPoint(page, cards.nth(2), { x: 440, y: 200 })

    // Now apply Neon dark theme and open the Themes tab for the screenshot
    await openMenu(page)
    await applyTheme(page, 'Neon')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Dark')
    await page.getByRole('tab', { name: 'Themes' }).click()
    await page.waitForTimeout(300)

    await screenshot(page, '03-themes-customization')
  })

  /**
   * Screenshot 4: Card edit panel with styling options visible
   * Shows: A card being edited — color, size, shadow, transparency controls
   */
  test('04 — Card styling & edit panel', async ({ page }) => {
    await openMenu(page)
    await applyTheme(page, 'Excalidraw')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Light')
    await closeMenu(page)

    await createCard(page, 'figma.com', 'Figma')
    await createCard(page, 'notion.so', 'Notion')
    await createCard(page, 'linear.app', 'Linear')
    await createCard(page, 'vercel.com', 'Vercel')

    const cards = page.getByTestId(/link-card-/)
    await moveCardToPoint(page, cards.nth(0), { x: 120, y: 180 })
    await moveCardToPoint(page, cards.nth(1), { x: 280, y: 180 })
    await moveCardToPoint(page, cards.nth(2), { x: 120, y: 360 })
    await moveCardToPoint(page, cards.nth(3), { x: 280, y: 360 })

    // Hover the card first: its action bar sits just above the top edge.
    await cards.nth(0).hover()
    await cards.nth(0).getByRole('button', { name: 'Update' }).click()
    await expect(page.getByTestId('card-edit-panel')).toBeVisible()

    await page.waitForTimeout(300)
    await screenshot(page, '04-card-edit-styling')
  })

  /**
   * Screenshot 5: Multiple workspaces (sidebar visible)
   * Shows: Workspace rail with multiple boards, demonstrating organization
   */
  test('05 — Multiple workspaces sidebar', async ({ page }) => {
    await openMenu(page)
    await applyTheme(page, 'Nord')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Dark')
    await closeMenu(page)

    await createCard(page, 'github.com', 'GitHub')
    await createCard(page, 'developer.mozilla.org', 'MDN Web Docs')
    await createCard(page, 'stackoverflow.com', 'Stack Overflow')

    const cards = page.getByTestId(/link-card-/)
    await moveCardToPoint(page, cards.nth(0), { x: 300, y: 200 })
    await moveCardToPoint(page, cards.nth(1), { x: 480, y: 200 })
    await moveCardToPoint(page, cards.nth(2), { x: 660, y: 200 })

    // Click empty area to deselect
    await page.mouse.click(900, 400)
    await page.waitForTimeout(200)

    // Open rail, pin it, create extra workspaces via JS to avoid switching
    await page.getByTestId('workspace-rail-toggle').click()
    await expect(page.getByTestId('workspace-rail')).toHaveAttribute(
      'data-open',
      'true',
    )
    await page.getByTestId('workspace-rail-pin').click()
    await expect(page.getByTestId('workspace-rail')).toHaveAttribute(
      'data-pinned',
      'true',
    )

    // Create workspaces — this switches to them, but we'll switch back
    await page.getByTestId('create-workspace').click()
    await expect(page.getByRole('tab', { name: 'Board 2' })).toBeVisible()

    await page.getByTestId('create-workspace').click()
    await expect(page.getByRole('tab', { name: 'Board 3' })).toBeVisible()

    // Switch back to Home — rail is pinned so tabs are accessible
    await page.getByRole('tab', { name: 'Home' }).click({ force: true })
    await page.waitForTimeout(500)

    await screenshot(page, '05-multiple-workspaces')
  })

  /**
   * Screenshot 6: Template library with a grouped reusable layout
   * Shows: A saved template built from a five-node group with preview thumbnails
   */
  test('06 — Template library with reusable layouts', async ({ page }) => {
    await openMenu(page)
    await applyTheme(page, 'Nord')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Dark')
    await closeMenu(page)

    await createGroup(page)
    const group = page.locator('article[data-testid^="card-group-"]').first()
    await moveCardToPoint(page, group.getByTestId(/card-group-header-/), {
      x: 180,
      y: 170,
    })

    await group
      .getByRole('button', { name: 'Update group' })
      .click({ force: true })
    await expect(page.getByTestId('group-edit-panel')).toBeVisible()
    await page.getByLabel(/Edit group name/).fill('Launch Kit')
    await page.getByLabel(/Edit group width for/).fill('18')
    await page.getByLabel(/Edit group height for/).fill('15')
    await dismissVisibleEditPanels(page)

    const groupBody = page.getByTestId(/card-group-body-/).first()

    const launchKitCards = [
      { url: 'github.com', title: 'GitHub', slot: { column: 0, row: 0 } },
      { url: 'figma.com', title: 'Figma', slot: { column: 1, row: 0 } },
      { url: 'notion.so', title: 'Docs', slot: { column: 2, row: 0 } },
      { url: 'linear.app', title: 'Linear', slot: { column: 0, row: 1 } },
      { url: 'vercel.com', title: 'Vercel', slot: { column: 1, row: 1 } },
    ]

    for (const link of launchKitCards) {
      await createCard(page, link.url, link.title)
      await moveCardIntoGroupSlot(
        page,
        page.getByTestId(/link-card-/).last(),
        groupBody,
        link.slot,
      )
      await dismissVisibleEditPanels(page)
    }

    // Select the whole group: clear the card selection first, then click the
    // group header so the template contains the group and its five cards.
    await page.mouse.click(1240, 60)
    const headerBox = await group
      .getByTestId(/card-group-header-/)
      .boundingBox()
    if (!headerBox) {
      throw new Error('group header has no box')
    }
    await page.mouse.click(headerBox.x + headerBox.width - 30, headerBox.y + 10)
    await expect(group).toHaveAttribute('data-selected', 'true')

    await openMenu(page)
    await page.getByRole('tab', { name: 'Templates' }).click()
    await expect(page.getByTestId('templates-panel')).toBeVisible()
    await expect(page.getByTestId('open-template-create')).toBeEnabled()

    await page.getByTestId('open-template-create').click()
    await page.getByLabel('Template name').fill('Launch Kit')
    await page
      .getByLabel('Template description')
      .fill('A reusable setup for product and dev links.')
    await page.getByRole('button', { name: 'Create template' }).click()

    await expect(page.getByTestId('template-status')).toContainText(
      'Saved template “Launch Kit”.',
    )

    const launchKitTemplate = page
      .getByTestId('templates-panel')
      .locator('article')
      .filter({ hasText: 'Launch Kit' })
      .first()

    await expect(
      launchKitTemplate.getByRole('img', {
        name: 'Template preview for Launch Kit',
      }),
    ).toBeVisible()

    await expect(page.getByTestId('templates-panel')).toContainText('Cards: 5')

    await screenshot(page, '06-template-library')
  })

  /**
   * Screenshot 7: Live charts and a merged news feed inside one group
   * Shows: Two chart nodes and a news feed node with sources, filter and sort
   */
  test('07 — Charts and news feeds', async ({ page }) => {
    test.setTimeout(120_000)
    await mockChartFeed(page)
    await mockFeedProxy(page)
    await page.reload()

    await openMenu(page)
    await applyTheme(page, 'Excalidraw')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Dark')
    await closeMenu(page)

    const drag = (node: Locator, x: number, y: number) =>
      // Grab the node by its title row and drop its top-left at (x, y).
      moveElementToPoint(
        page,
        node,
        { x: x + 40, y: y + 14 },
        {
          pointerDownMethod: 'mouse',
          sourceOffset: { x: 40, y: 14 },
          settleMs: 150,
          steps: 8,
        },
      )

    // Each node is placed right after it is created, so nothing overlaps.
    const chartSlots = [
      { symbol: 'AAPL', x: 48, y: 48 },
      { symbol: 'SAP.DE', x: 48, y: 312 },
      { symbol: '^GDAXI', x: 856, y: 48 },
    ]

    for (const slot of chartSlots) {
      await page.getByRole('button', { name: 'Add chart' }).click()
      const chart = page.getByTestId(/chart-node-/).last()

      await expect(chart.getByTestId('chart-price')).not.toBeEmpty()

      if (slot.symbol !== 'AAPL') {
        await chart.getByRole('button', { name: 'Chart options' }).click()
        const options = page.getByTestId('chart-options')
        await options.getByLabel('Chart symbol').fill(slot.symbol)
        await options.getByRole('button', { name: 'Apply source' }).click()
        await page.keyboard.press('Escape')
        await expect(options).toHaveCount(0)
      }

      const chartId = await chart.getAttribute('data-testid')
      await drag(page.getByTestId(chartId ?? ''), slot.x, slot.y)
    }

    // News feed with four sources.
    await page.getByRole('button', { name: 'Add news feed' }).click()
    const feed = page.getByTestId(/feed-node-/).first()

    await feed.getByLabel('Feed URL').fill('https://news.example/Tech%20Daily')
    await feed.getByRole('button', { name: 'Add feed' }).click()
    await expect(feed.getByTestId('feed-item').first()).toBeVisible()

    await feed.getByRole('button', { name: 'Feed options' }).click()
    const feedOptions = page.getByTestId('feed-options')
    for (const source of ['Markets Wire', 'Research Notes', 'Europe Today']) {
      await feedOptions
        .getByLabel('Feed URL')
        .fill(`https://news.example/${encodeURIComponent(source)}`)
      await feedOptions.getByRole('button', { name: 'Add feed' }).click()
    }
    await page.keyboard.press('Escape')
    await expect(feed.getByTestId('feed-item')).toHaveCount(NEWS_ITEMS.length)
    await drag(feed, 464, 48)

    for (const [index, [url, title]] of [
      ['finance.yahoo.com', 'Yahoo Finance'],
      ['reuters.com', 'Reuters'],
      ['tagesschau.de', 'Tagesschau'],
    ].entries()) {
      await createCard(page, url, title)
      const cardId = await page
        .getByTestId(/link-card-/)
        .last()
        .getAttribute('data-testid')
      await drag(page.getByTestId(cardId ?? ''), 856 + index * 128, 336)
    }

    await page.mouse.click(1240, 700)
    await screenshot(page, '07-charts-and-news')
  })

  /**
   * Screenshot 8: Statistics tab of the redesigned menu
   * Shows: Overview strip, timeline and top cards for a small board
   */
  test('08 — Local statistics', async ({ page }) => {
    await openMenu(page)
    await applyTheme(page, 'Minimal')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Light')
    await closeMenu(page)

    const links = [
      ['github.com', 'GitHub'],
      ['developer.mozilla.org', 'MDN Web Docs'],
      ['news.ycombinator.com', 'Hacker News'],
      ['figma.com', 'Figma'],
    ] as const

    for (const [url, title] of links) {
      await createCard(page, url, title)
    }

    const cards = page.getByTestId(/link-card-/)
    for (let index = 0; index < links.length; index += 1) {
      await moveCardToPoint(page, cards.nth(index), {
        x: 110 + (index % 2) * 160,
        y: 170 + Math.floor(index / 2) * 170,
      })
    }

    // Some link opens so the timeline and the top-cards table have data.
    await page.getByRole('button', { name: 'Toggle interaction mode' }).click()
    await page
      .context()
      .route('**/*', (route) =>
        route.request().resourceType() === 'document' &&
        !route.request().url().startsWith('http://127.0.0.1:4173')
          ? route.fulfill({ body: '<title>ok</title>' })
          : route.continue(),
      )
    for (const [index, opens] of [5, 3, 2, 1].entries()) {
      for (let open = 0; open < opens; open += 1) {
        const popup = page.context().waitForEvent('page')
        await cards.nth(index).locator('a').click()
        await (await popup).close()
      }
    }

    await openMenu(page)
    await page.getByRole('tab', { name: 'Statistics' }).click()
    await expect(page.getByTestId('statistics-panel')).toBeVisible()
    await screenshot(page, '08-local-statistics')
  })

  /**
   * Screenshot 10: Notes
   * Shows: Two note nodes with freehand sketches and handwritten text
   */
  test('10 — Notes', async ({ page }) => {
    await openMenu(page)
    await applyTheme(page, 'Excalidraw')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Light')
    await closeMenu(page)

    const notes = page.getByTestId(/note-node-/)
    const drawLine = async (points: Array<[number, number]>) => {
      await page.mouse.move(...points[0])
      await page.mouse.down()

      for (const [index, point] of points.slice(1).entries()) {
        const [fromX, fromY] = points[index]

        for (let step = 1; step <= 8; step += 1) {
          await page.mouse.move(
            fromX + ((point[0] - fromX) * step) / 8,
            fromY + ((point[1] - fromY) * step) / 8,
          )
        }
      }

      await page.mouse.up()
    }
    const write = async (x: number, y: number, text: string) => {
      await page.mouse.dblclick(x, y)
      await page.keyboard.type(text)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(150)
    }

    // A plan for the weekend: a list with ticks.
    await page.getByRole('button', { name: 'Add note' }).click()
    await expect(notes).toHaveCount(1)
    await moveCardToPoint(page, notes.first().getByTestId(/note-toolbar/), {
      x: 360,
      y: 140,
    })

    let pad = (await notes.first().getByTestId('note-pad').boundingBox())!

    await write(pad.x + 30, pad.y + 40, 'Weekend')
    await drawLine([
      [pad.x + 28, pad.y + 72],
      [pad.x + 150, pad.y + 70],
    ])
    await write(pad.x + 50, pad.y + 105, 'Book tickets')
    await write(pad.x + 50, pad.y + 145, 'Backup NAS')
    await write(pad.x + 50, pad.y + 185, 'Call Mia')
    await drawLine([
      [pad.x + 26, pad.y + 106],
      [pad.x + 32, pad.y + 114],
      [pad.x + 42, pad.y + 96],
    ])
    await drawLine([
      [pad.x + 26, pad.y + 146],
      [pad.x + 32, pad.y + 154],
      [pad.x + 42, pad.y + 136],
    ])

    // A quick sketch: two boxes and an arrow.
    await page.getByRole('button', { name: 'Add note' }).click()
    await expect(notes).toHaveCount(2)
    await moveCardToPoint(page, notes.last().getByTestId(/note-toolbar/), {
      x: 820,
      y: 300,
    })
    pad = (await notes.last().getByTestId('note-pad').boundingBox())!
    await drawLine([
      [pad.x + 30, pad.y + 60],
      [pad.x + 110, pad.y + 58],
      [pad.x + 112, pad.y + 110],
      [pad.x + 32, pad.y + 112],
      [pad.x + 30, pad.y + 60],
    ])
    await drawLine([
      [pad.x + 120, pad.y + 85],
      [pad.x + 175, pad.y + 86],
    ])
    await drawLine([
      [pad.x + 162, pad.y + 76],
      [pad.x + 176, pad.y + 86],
      [pad.x + 162, pad.y + 96],
    ])
    await drawLine([
      [pad.x + 185, pad.y + 60],
      [pad.x + 260, pad.y + 62],
      [pad.x + 258, pad.y + 112],
      [pad.x + 186, pad.y + 110],
      [pad.x + 185, pad.y + 60],
    ])
    await write(pad.x + 45, pad.y + 150, 'App')
    await write(pad.x + 195, pad.y + 150, 'Server')

    await page.mouse.click(1180, 700)
    await page.waitForTimeout(300)
    await screenshot(page, '10-notes')
  })

  /**
   * Screenshot 11: Homelab app icons
   * Shows: A homelab group whose cards got their app icons
   */
  test('11 — Homelab app icons', async ({ page }) => {
    // Real icons from jsDelivr; APP_ICONS_DIR serves them from a folder of
    // dashboard-icons SVGs instead (offline runs).
    const iconDir = process.env.APP_ICONS_DIR

    if (iconDir) {
      await page.route('https://cdn.jsdelivr.net/**', (route) => {
        const file = join(iconDir, route.request().url().split('/').pop()!)

        return existsSync(file)
          ? route.fulfill({
              contentType: 'image/svg+xml',
              body: readFileSync(file),
            })
          : route.fulfill({ status: 404 })
      })
    }

    await enableNetworkFeatures(page, { appIcons: true })
    await page.reload()
    await openMenu(page)
    await applyTheme(page, 'Nord')
    await page.getByRole('tab', { name: 'Options' }).click()
    await selectOption(page, 'Color mode', 'Dark')
    await closeMenu(page)

    await createGroup(page)
    const group = page.locator('article[data-testid^="card-group-"]').first()
    await moveCardToPoint(page, group.getByTestId(/card-group-header-/), {
      x: 230,
      y: 170,
    })
    await group
      .getByRole('button', { name: 'Update group' })
      .click({ force: true })
    await page.getByLabel(/Edit group name/).fill('Homelab')
    await page.getByLabel(/Edit group width for/).fill('27')
    await page.getByLabel(/Edit group height for/).fill('14')
    await dismissVisibleEditPanels(page)

    const body = page.getByTestId(/card-group-body-/).first()
    const apps = [
      ['192.168.1.20:8096', 'Jellyfin'],
      ['192.168.1.20:7878', 'Radarr'],
      ['192.168.1.20:8989', 'Sonarr'],
      ['192.168.1.20:9696', 'Prowlarr'],
      ['192.168.1.30:8123', 'Home Assistant'],
      ['192.168.1.40:8080', 'Dozzle'],
      ['192.168.1.40:8090', 'Beszel'],
      ['192.168.1.40:9120', 'Komodo'],
      ['192.168.1.50:3000', 'Open WebUI'],
      ['ntfy.sh/homelab', 'ntfy'],
    ] as const

    const bodyBox = (await body.boundingBox())!

    for (const [index, [url, title]] of apps.entries()) {
      await createCard(page, url, title)

      const card = page.getByTestId(/link-card-/).last()
      const cardBox = (await card.boundingBox())!

      // Edge to edge, like a dashboard of tiles.
      await moveElementToPoint(
        page,
        card,
        {
          x: bodyBox.x + 24 + cardBox.width / 2 + (index % 5) * cardBox.width,
          y:
            bodyBox.y +
            24 +
            cardBox.height / 2 +
            Math.floor(index / 5) * cardBox.height,
        },
        { sourcePosition: 'center', settleMs: 200 },
      )
      await dismissVisibleEditPanels(page)
    }

    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="card-image"][src^="blob:"]')
          .length >= 10,
    )
    await page.mouse.click(1180, 700)
    await page.waitForTimeout(400)
    await screenshot(page, '11-homelab-app-icons')
  })

  /**
   * Screenshot 12: Device sync
   * Shows: The Sync tab with three devices, the workspace choice and the
   * sync code with its QR code
   */
  test('12 — Device sync', async ({ page, browser }) => {
    test.setTimeout(120_000)

    const dataDir = mkdtempSync(join(tmpdir(), 'linkhaven-shots-'))
    const server = createLinkhavenServer({
      ...readServerConfig({}),
      dataDir,
      charts: false,
      webApp: false,
      idleDays: 0,
    })

    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))

    const localUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    // The panel shows a real-looking address; requests go to the local server.
    const serverUrl = 'https://linkhaven.oli-tech.eu'
    const forward = (target: Page) =>
      target.context().route(`${serverUrl}/**`, async (route) =>
        route.fulfill({
          response: await route.fetch({
            url: route.request().url().replace(serverUrl, localUrl),
          }),
        }),
      )
    const openSync = async (target: Page, name: string) => {
      await openMenu(target)
      const menu = target.getByRole('dialog')
      await menu.getByRole('tab', { name: 'Privacy' }).click()
      await target.getByLabel('Device sync').check()
      await menu.getByRole('tab', { name: 'Sync' }).click()
      await target.getByLabel('Sync server address').fill(serverUrl)
      await target.getByLabel('Device name').fill(name)
    }
    const synced = (target: Page) =>
      expect(target.getByTestId('sync-status')).toContainText(
        /Synced|Up to date/,
        { timeout: 20_000 },
      )

    try {
      await forward(page)
      await openSync(page, 'Laptop')
      await page.getByTestId('sync-create').click()
      await synced(page)
      await page.getByTestId('sync-show-code').click()

      const code = (await page.getByTestId('sync-code').textContent())!.trim()

      for (const [name, chooseOnly] of [
        ['Phone', false],
        ['Office PC', true],
      ] as const) {
        const device = await (await browser.newContext()).newPage()

        await forward(device)
        await device.goto('/')
        await openSync(device, name)

        if (chooseOnly) {
          await device.getByLabel('Only workspaces I choose').check()
        }

        await device.getByLabel('Sync code').fill(code)
        await device.getByTestId('sync-join').click()
        await synced(device)
        await device.context().close()
      }

      // The joiners' empty Home came over with its default theme; style the
      // board now and give it something to show.
      await page.getByTestId('sync-now').click()
      await synced(page)
      await applyTheme(page, 'Minimal')
      await page.getByRole('tab', { name: 'Options' }).click()
      await selectOption(page, 'Color mode', 'Light')
      await closeMenu(page)
      await page.getByRole('button', { name: 'Add note' }).click()
      const note = page.getByTestId(/note-node-/)
      await moveCardToPoint(page, note.getByTestId(/note-toolbar/), {
        x: 120,
        y: 140,
      })
      const pad = (await note.getByTestId('note-pad').boundingBox())!
      await page.mouse.dblclick(pad.x + 30, pad.y + 50)
      await page.keyboard.type('Same board on every device')
      await page.keyboard.press('Escape')
      await page.mouse.click(1150, 640)

      await openMenu(page)
      await page.getByRole('dialog').getByRole('tab', { name: 'Sync' }).click()
      await page.getByTestId('sync-now').click()
      await synced(page)
      await expect(page.getByTestId('sync-devices')).toContainText('Office PC')
      await page.getByTestId('sync-devices').scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await screenshot(page, '12-device-sync')
    } finally {
      server.closeAllConnections()
      await new Promise((done) => server.close(done))
      rmSync(dataDir, { recursive: true, force: true })
    }
  })

  /**
   * Promotional tiles for Chrome and Edge, rendered from
   * extension/store-assets/promo-tile.html with the screenshots above.
   */
  test('09 — Promotional tiles', async ({ page }) => {
    const tiles = [
      {
        size: 'large',
        width: 1400,
        height: 560,
        files: [
          'chrome-marquee-promotional-tile-1400x560',
          'edge-large-promotional-tile-1400x560',
        ],
      },
      {
        size: 'small',
        width: 440,
        height: 280,
        files: [
          'chrome-small-promotional-tile-440x280',
          'edge-small-promotional-tile-440x280',
        ],
      },
    ] as const
    const source = pathToFileURL(
      resolve('extension/store-assets/promo-tile.html'),
    ).href

    for (const tile of tiles) {
      await page.setViewportSize({ width: tile.width, height: tile.height })
      await page.goto(`${source}?size=${tile.size}`)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() =>
        [...document.images].every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      )

      for (const file of tile.files) {
        await page.screenshot({
          path: `extension/store-assets/${file}.png`,
          clip: { x: 0, y: 0, width: tile.width, height: tile.height },
        })
      }
    }
  })
})
