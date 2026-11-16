import type { Fix, LatLng, TrackPoint } from '../types'

const EARTH_RADIUS_M = 6_371_008.8

/** Readings less accurate than this (a bigger circle of doubt) are ignored. */
export const MAX_ACCURACY_M = 50
/** A reading must be at least this far from the last accepted one, so standing still does not draw a scribble. */
export const MIN_MOVE_M = 5
/** Faster than this between two readings (about 250 km/h) is a GPS jump, not travel. */
export const MAX_SPEED_MPS = 70

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Great-circle distance between two points in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Total length of a track in metres. Points in different segments (before and after a pause) are never joined. */
export function pathDistanceM(points: readonly Pick<TrackPoint, 'lat' | 'lng' | 'seg'>[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]
    const current = points[i]
    if (previous && current && previous.seg === current.seg) total += haversineM(previous, current)
  }
  return total
}

export function isValidCoordinate(point: LatLng): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180
}

export type Rejection = 'invalid' | 'inaccurate' | 'out-of-order' | 'too-close' | 'jump'

export type Verdict = { accept: true } | { accept: false; reason: Rejection }

/**
 * Decides whether a GPS reading should become part of the track. It drops readings with a bad position or a wide
 * margin of error, readings that are not newer than the last one, readings that barely moved (compared with the last
 * point that was kept, so slow walking still adds up), and readings that would mean impossible speed.
 * `previous` is the last accepted point of the current segment, or null for the first point after a start or resume.
 */
export function judgeFix(previous: TrackPoint | null, fix: Fix): Verdict {
  if (!isValidCoordinate(fix) || !Number.isFinite(fix.ts)) return { accept: false, reason: 'invalid' }
  if (!Number.isFinite(fix.accuracyM) || fix.accuracyM > MAX_ACCURACY_M) return { accept: false, reason: 'inaccurate' }
  if (!previous) return { accept: true }
  if (fix.ts <= previous.ts) return { accept: false, reason: 'out-of-order' }
  const distance = haversineM(previous, fix)
  if (distance < MIN_MOVE_M) return { accept: false, reason: 'too-close' }
  const seconds = Math.max(1, (fix.ts - previous.ts) / 1000)
  if (distance / seconds > MAX_SPEED_MPS) return { accept: false, reason: 'jump' }
  return { accept: true }
}

/** The rectangle that holds every point, as [[south, west], [north, east]], or null for no points. */
export function boundsOf(points: readonly LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let south = Infinity
  let north = -Infinity
  let west = Infinity
  let east = -Infinity
  for (const p of points) {
    south = Math.min(south, p.lat)
    north = Math.max(north, p.lat)
    west = Math.min(west, p.lng)
    east = Math.max(east, p.lng)
  }
  return [[south, west], [north, east]]
}

/** Splits a track into its segments, each sorted by time, ready to draw as separate lines. */
export function segmentsOf<T extends Pick<TrackPoint, 'seg' | 'ts'>>(points: readonly T[]): T[][] {
  const bySegment = new Map<number, T[]>()
  for (const point of points) bySegment.set(point.seg, [...(bySegment.get(point.seg) ?? []), point])
  return [...bySegment.entries()].sort((a, b) => a[0] - b[0]).map(([, list]) => list.sort((a, b) => a.ts - b.ts))
}

/** Time spent recording from the points alone: the gaps inside each segment added up, never the pauses between segments. */
export function activeSeconds(points: readonly Pick<TrackPoint, 'ts' | 'seg'>[]): number {
  let total = 0
  for (const segment of segmentsOf(points)) {
    const first = segment[0]
    const last = segment.at(-1)
    if (first && last) total += (last.ts - first.ts) / 1000
  }
  return total
}
