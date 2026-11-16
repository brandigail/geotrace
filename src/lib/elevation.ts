import type { TrackPoint } from '../types'
import { haversineM } from './geo'

/** GPS altitude is noisy by several metres, so up and down moves smaller than this are ignored when adding up climbing. */
export const CLIMB_THRESHOLD_M = 3
const SMOOTHING_WINDOW = 5

export interface ElevationSample {
  /** Distance along the track in metres. */
  distanceM: number
  /** Smoothed altitude in metres. */
  altM: number
}

export interface ElevationStats {
  gainM: number
  lossM: number
  minM: number
  maxM: number
}

/** Averages each value with its neighbours, which takes most of the GPS jitter out of an altitude line. */
export function smooth(values: readonly number[], window = SMOOTHING_WINDOW): number[] {
  const half = Math.floor(window / 2)
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - half), Math.min(values.length, i + half + 1))
    return slice.reduce((sum, v) => sum + v, 0) / slice.length
  })
}

/** Altitude against distance travelled, for the elevation chart. Points with no altitude are skipped; fewer than two gives nothing. */
export function elevationProfile(points: readonly TrackPoint[]): ElevationSample[] {
  const ordered = [...points].sort((a, b) => a.seg - b.seg || a.ts - b.ts)
  const distances: number[] = []
  const altitudes: number[] = []
  let distance = 0
  ordered.forEach((point, i) => {
    const previous = ordered[i - 1]
    if (previous && previous.seg === point.seg) distance += haversineM(previous, point)
    if (point.altM !== null && Number.isFinite(point.altM)) {
      distances.push(distance)
      altitudes.push(point.altM)
    }
  })
  if (altitudes.length < 2) return []
  const smoothed = smooth(altitudes)
  return smoothed.map((altM, i) => ({ distanceM: distances[i] ?? 0, altM }))
}

/** Total climbing and descending (ignoring small wobbles) plus the lowest and highest points. Null when there is no altitude data. */
export function elevationStats(samples: readonly ElevationSample[]): ElevationStats | null {
  const first = samples[0]
  if (!first) return null
  let gain = 0
  let loss = 0
  let reference = first.altM
  let min = first.altM
  let max = first.altM
  for (const { altM } of samples) {
    min = Math.min(min, altM)
    max = Math.max(max, altM)
    const change = altM - reference
    if (Math.abs(change) >= CLIMB_THRESHOLD_M) {
      if (change > 0) gain += change
      else loss -= change
      reference = altM
    }
  }
  return { gainM: gain, lossM: loss, minM: min, maxM: max }
}
