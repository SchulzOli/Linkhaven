import { useEffect, useState } from 'react'

import { describeLastSync } from '../../features/sync/syncTime'
import { useSyncStore } from '../../state/useSyncStore'
import styles from './BottomTaskbar.module.css'
import { SyncIcon } from './TaskbarIcons'

type SyncState = 'synced' | 'syncing' | 'warning' | 'error' | 'offline'

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)

    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return online
}

/**
 * Device sync at a glance, next to the menu: synced, syncing, offline or a
 * problem, with the last sync in the tooltip. A click syncs now. Shown only
 * while sync is on and this device is connected.
 */
export function SyncStatusButton() {
  const connection = useSyncStore((state) => state.connection)
  const status = useSyncStore((state) => state.status)
  const sync = useSyncStore((state) => state.sync)
  const online = useOnline()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    void useSyncStore.getState().load()

    const timer = window.setInterval(() => setNow(Date.now()), 30_000)

    return () => window.clearInterval(timer)
  }, [])

  if (!connection) {
    return null
  }

  const state: SyncState = !online
    ? 'offline'
    : status.kind === 'busy'
      ? 'syncing'
      : status.kind === 'error'
        ? 'error'
        : status.kind === 'warning'
          ? 'warning'
          : 'synced'
  const lastSync = describeLastSync(connection.lastSyncAt, now)
  const label =
    state === 'offline'
      ? `Offline · last sync ${lastSync}; changes sync once you're back online`
      : state === 'syncing'
        ? 'Syncing…'
        : state === 'error' || state === 'warning'
          ? `${status.message} · last sync ${lastSync}`
          : `Synced ${lastSync} · click to sync now`

  return (
    <button
      aria-label={label}
      className={`${styles.modeButton} ${styles.syncStatus}`}
      data-state={state}
      data-testid="sync-status-button"
      disabled={state === 'syncing' || state === 'offline'}
      onClick={() => void sync()}
      title={label}
      type="button"
    >
      <span aria-hidden="true" className={styles.modeIcon}>
        <SyncIcon className={styles.modeSvg} />
      </span>
      <span aria-hidden="true" className={styles.syncDot} />
    </button>
  )
}
