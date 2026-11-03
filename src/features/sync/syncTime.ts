/** "just now", "5 min ago", "2 h ago", or the date. */
export function describeLastSync(value: string | undefined, now: number) {
  const time = value ? new Date(value).getTime() : Number.NaN

  if (Number.isNaN(time)) {
    return 'not synced yet'
  }

  const minutes = Math.floor((now - time) / 60_000)

  if (minutes < 1) {
    return 'just now'
  }

  if (minutes < 60) {
    return `${minutes} min ago`
  }

  if (minutes < 24 * 60) {
    return `${Math.floor(minutes / 60)} h ago`
  }

  return new Date(time).toLocaleDateString()
}
