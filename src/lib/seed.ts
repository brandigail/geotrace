import type { TrackPoint, Trip, Waypoint } from '../types'
import { activeSeconds, haversineM, pathDistanceM } from './geo'

/** [latitude, longitude, altitude in metres]. */
type Vertex = readonly [number, number, number]

interface RouteSpec {
  id: string
  name: string
  /** How long ago the trip started. */
  daysAgo: number
  vertices: readonly Vertex[]
  /** Metres per second while moving. */
  speedMps: number
  /** Seconds between GPS points. */
  everySec: number
  /** Distance fractions (0 to 1) at which the recording was paused for a while. */
  pauses: readonly { at: number; minutes: number }[]
  waypoints: readonly { at: number; note: string; photo: boolean }[]
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The vertices of a closed loop shaped like an ellipse, so a run around a reservoir looks like one. */
function ellipse(centre: readonly [number, number], radiusLatDeg: number, radiusLngDeg: number, altM: number, steps = 56): Vertex[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI
    return [centre[0] + radiusLatDeg * Math.cos(t), centre[1] + radiusLngDeg * Math.sin(t), altM] as const
  })
}

/** A winding path between two places: the straight line with a gentle sideways swing and a climbing profile that is steeper at the end. */
function winding(from: readonly [number, number, number], to: readonly [number, number, number], swings: number, sideDeg: number, steps = 40): Vertex[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const s = i / steps
    const side = Math.sin(s * Math.PI * swings) * sideDeg * Math.sin(s * Math.PI)
    return [from[0] + (to[0] - from[0]) * s + side * 0.4, from[1] + (to[1] - from[1]) * s + side, from[2] + (to[2] - from[2]) * s ** 1.15] as const
  })
}

const SPECS: readonly RouteSpec[] = [
  {
    id: 'sample-reservoir',
    name: 'Reservoir run, Central Park',
    daysAgo: 2,
    vertices: ellipse([40.7855, -73.9585], 0.0046, 0.0034, 40),
    speedMps: 2.9,
    everySec: 6,
    pauses: [],
    waypoints: [
      { at: 0.0, note: 'Start by the north gate house', photo: false },
      { at: 0.5, note: 'Cherry trees in bloom on the west side', photo: true },
    ],
  },
  {
    id: 'sample-snowdon',
    name: 'Snowdon: Llanberis Path',
    daysAgo: 9,
    vertices: winding([53.119, -4.128, 120], [53.0685, -4.0763, 1085], 9, 0.0075, 90),
    speedMps: 0.95,
    everySec: 30,
    pauses: [{ at: 0.45, minutes: 12 }],
    waypoints: [
      { at: 0.0, note: 'Trailhead car park, early start', photo: false },
      { at: 0.45, note: 'Halfway house: tea and a rest', photo: true },
      { at: 1.0, note: 'Summit! Clear views for about ten minutes', photo: true },
    ],
  },
  {
    id: 'sample-vondelpark',
    name: 'Vondelpark cycle loop',
    daysAgo: 20,
    vertices: [
      [52.3615, 4.8575, 1],
      [52.3628, 4.866, 1],
      [52.3626, 4.8765, 1],
      [52.3606, 4.8815, 1],
      [52.357, 4.8795, 1],
      [52.3552, 4.8715, 1],
      [52.3552, 4.8625, 1],
      [52.3575, 4.8572, 1],
      [52.3615, 4.8575, 1],
      [52.3628, 4.866, 1],
      [52.3626, 4.8765, 1],
      [52.3606, 4.8815, 1],
      [52.357, 4.8795, 1],
      [52.3552, 4.8715, 1],
    ],
    speedMps: 5.2,
    everySec: 5,
    pauses: [],
    waypoints: [
      { at: 0.25, note: 'Coffee at the pavilion', photo: true },
      { at: 0.8, note: 'Bike path closed for repairs, took the road', photo: false },
    ],
  },
]

export type MakePhoto = (label: string) => Promise<Blob | null>

interface Built {
  trip: Trip
  points: TrackPoint[]
  waypoints: Waypoint[]
}

/** Walks along the vertices at a steady speed, dropping a GPS point every few seconds with a little noise in position and altitude. */
async function build(spec: RouteSpec, now: Date, makePhoto: MakePhoto, seed: number): Promise<Built> {
  const random = mulberry32(seed)
  const noise = (scale: number) => (random() - 0.5) * 2 * scale
  const legs = spec.vertices.slice(1).map((to, i) => {
    const from = spec.vertices[i] as Vertex
    return { from, to, length: haversineM({ lat: from[0], lng: from[1] }, { lat: to[0], lng: to[1] }) }
  })
  const total = legs.reduce((sum, leg) => sum + leg.length, 0)
  const at = (distance: number): { lat: number; lng: number; alt: number } => {
    let left = Math.min(Math.max(0, distance), total)
    for (const leg of legs) {
      if (left <= leg.length || leg === legs.at(-1)) {
        const f = leg.length === 0 ? 0 : Math.min(1, left / leg.length)
        return { lat: leg.from[0] + (leg.to[0] - leg.from[0]) * f, lng: leg.from[1] + (leg.to[1] - leg.from[1]) * f, alt: leg.from[2] + (leg.to[2] - leg.from[2]) * f }
      }
      left -= leg.length
    }
    return { lat: spec.vertices[0]?.[0] ?? 0, lng: spec.vertices[0]?.[1] ?? 0, alt: 0 }
  }

  const startedAt = now.getTime() - spec.daysAgo * 86_400_000 - 3 * 3_600_000
  const step = spec.speedMps * spec.everySec
  const points: TrackPoint[] = []
  let ts = startedAt
  let seg = 0
  const pauses = [...spec.pauses].sort((a, b) => a.at - b.at)
  let nextPause = pauses.shift()
  for (let d = 0; d <= total; d += step) {
    if (nextPause && d / total >= nextPause.at) {
      ts += nextPause.minutes * 60_000
      seg += 1
      nextPause = pauses.shift()
    }
    const p = at(d)
    points.push({
      tripId: spec.id,
      ts,
      lat: p.lat + noise(0.00002),
      lng: p.lng + noise(0.00003),
      altM: Math.round((p.alt + noise(1.2)) * 10) / 10,
      accuracyM: Math.round((5 + random() * 7) * 10) / 10,
      seg,
    })
    ts += spec.everySec * 1000
  }

  const end = points.at(-1)?.ts ?? startedAt
  const waypoints: Waypoint[] = []
  for (const [i, w] of spec.waypoints.entries()) {
    const target = at(w.at * total)
    // Dropped at the moment the walker passed that spot.
    const near = points.reduce((best, p) => (haversineM(p, { lat: target.lat, lng: target.lng }) < haversineM(best, { lat: target.lat, lng: target.lng }) ? p : best), points[0] as TrackPoint)
    waypoints.push({
      id: `${spec.id}-wp-${i + 1}`,
      tripId: spec.id,
      lat: Math.round(target.lat * 1e6) / 1e6,
      lng: Math.round(target.lng * 1e6) / 1e6,
      note: w.note,
      photo: w.photo ? await makePhoto(w.note) : null,
      createdAt: new Date(near.ts + 20_000).toISOString(),
    })
  }

  const trip: Trip = {
    id: spec.id,
    name: spec.name,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(end).toISOString(),
    distanceM: Math.round(pathDistanceM(points)),
    durationSec: Math.round(activeSeconds(points)),
  }
  return { trip, points, waypoints }
}

export interface SeedData {
  trips: Trip[]
  points: TrackPoint[]
  waypoints: Waypoint[]
}

/**
 * Three finished trips so the history is not empty on first launch. They are generated along approximate real
 * coordinates (a reservoir loop, a mountain path and a park loop) with realistic speed, pauses, GPS noise and altitude.
 * They are synthetic, not recorded GPS tracks.
 */
export async function buildSeed(now: Date = new Date(), makePhoto: MakePhoto = async () => null): Promise<SeedData> {
  const built = await Promise.all(SPECS.map((spec, i) => build(spec, now, makePhoto, 101 + i)))
  return { trips: built.map((b) => b.trip), points: built.flatMap((b) => b.points), waypoints: built.flatMap((b) => b.waypoints) }
}
