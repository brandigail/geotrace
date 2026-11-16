const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `850 m` below a kilometre, otherwise `4.52 km`. */
export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) return '0 m'
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(metres < 10_000 ? 2 : 1)} km`
}

/** `0:07`, `12:34` or `1:02:03`. */
export function formatDuration(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

/** Average speed in km/h, or null when there is no time or distance to work it out from. */
export function averageSpeedKmh(distanceM: number, durationSec: number): number | null {
  return durationSec > 0 && distanceM > 0 ? distanceM / 1000 / (durationSec / 3600) : null
}

export function formatSpeed(kmh: number | null): string {
  return kmh === null ? '–' : `${kmh.toFixed(1)} km/h`
}

/** Pace as minutes per kilometre, for example `5:30 /km`, or a dash when it cannot be worked out. */
export function formatPace(kmh: number | null): string {
  if (kmh === null || kmh < 0.5) return '–'
  const secondsPerKm = Math.round(3600 / kmh)
  return `${Math.floor(secondsPerKm / 60)}:${String(secondsPerKm % 60).padStart(2, '0')} /km`
}

export function formatElevation(metres: number): string {
  return `${Math.round(metres)} m`
}

/** For example `16 Nov 2026, 14:32`. */
export function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** A file name stem safe on every system, for example `snowdon-llanberis-path`. */
export function fileStem(name: string): string {
  const stem = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return stem || 'trip'
}
