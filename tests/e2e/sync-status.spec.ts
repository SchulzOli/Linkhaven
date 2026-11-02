import { mkdtemp, rm } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

// @ts-expect-error -- plain ESM server module without type declarations
import {
  createLinkhavenServer,
  readServerConfig,
} from '../../server/linkhaven-server.mjs'

let server: ReturnType<typeof createLinkhavenServer>
let serverUrl: string
let dataDir: string

test.skip(({ isMobile }) => isMobile, 'One device; runs once, on desktop')

test.beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'linkhaven-e2e-status-'))
  server = createLinkhavenServer({
    ...readServerConfig({}),
    dataDir,
    charts: false,
    webApp: false,
    idleDays: 0,
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  serverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

test.afterAll(async () => {
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await rm(dataDir, { recursive: true, force: true })
})

test('the taskbar shows the sync status and syncs on a click', async ({
  page,
  context,
}) => {
  await page.goto('/')

  const button = page.getByTestId('sync-status-button')

  // Not there until sync is on and connected.
  await expect(button).toHaveCount(0)

  await page.getByRole('button', { name: 'Open menu' }).click()

  const menu = page.getByRole('dialog')

  await menu.getByRole('tab', { name: 'Privacy' }).click()
  await page.getByLabel('Device sync').check()
  await menu.getByRole('tab', { name: 'Sync' }).click()
  await page.getByLabel('Sync server address').fill(serverUrl)
  await page.getByTestId('sync-create').click()
  await expect(page.getByTestId('sync-status')).toContainText('Synced', {
    timeout: 20000,
  })
  await page.keyboard.press('Escape')

  await expect(button).toHaveAttribute('data-state', 'synced')
  await expect(button).toHaveAttribute('title', /Synced just now/)

  // Offline: says so and waits.
  await context.setOffline(true)
  await expect(button).toHaveAttribute('data-state', 'offline')
  await expect(button).toBeDisabled()

  // Back online: syncs by itself and is clickable again.
  await context.setOffline(false)
  await expect(button).toHaveAttribute('data-state', 'synced')
  await button.click()
  await expect(button).toHaveAttribute('data-state', 'synced', {
    timeout: 20000,
  })
})
