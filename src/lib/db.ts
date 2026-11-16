import Dexie, { type Table } from 'dexie'
import type { TrackPoint, Trip, Waypoint } from '../types'

/** Trips, their GPS points and their waypoints (with photos as Blobs), all stored on this device. */
export class GeoTraceDb extends Dexie {
  trips!: Table<Trip, string>
  /** Points have no id of their own: the database numbers them, and they are read back by trip and sorted by time. */
  points!: Table<TrackPoint, number>
  waypoints!: Table<Waypoint, string>

  constructor(name = 'geotrace') {
    super(name)
    this.version(1).stores({ trips: 'id, startedAt', points: '++, tripId', waypoints: 'id, tripId' })
  }
}

export const db = new GeoTraceDb()

export async function createTrip(database: GeoTraceDb, name: string, now: Date = new Date()): Promise<Trip> {
  const trip: Trip = { id: crypto.randomUUID(), name: name.trim() || defaultName(now), startedAt: now.toISOString(), endedAt: null, distanceM: 0, durationSec: 0 }
  await database.trips.add(trip)
  return trip
}

/** For example "Trip 16 Nov, 14:32". */
export function defaultName(now: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Trip ${now.getDate()} ${months[now.getMonth()]}, ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export async function addPoint(database: GeoTraceDb, point: TrackPoint): Promise<void> {
  await database.points.add(point)
}

/** A trip's points in the order they were recorded. */
export async function pointsOf(database: GeoTraceDb, tripId: string): Promise<TrackPoint[]> {
  return (await database.points.where('tripId').equals(tripId).toArray()).sort((a, b) => a.seg - b.seg || a.ts - b.ts)
}

export type TripPatch = Partial<Pick<Trip, 'name' | 'endedAt' | 'distanceM' | 'durationSec'>>

export async function updateTrip(database: GeoTraceDb, id: string, patch: TripPatch): Promise<void> {
  const change: TripPatch = { ...patch }
  if (change.name !== undefined) {
    const name = change.name.replace(/\s+/g, ' ').trim().slice(0, 80)
    if (name) change.name = name
    else delete change.name
  }
  if (Object.keys(change).length > 0) await database.trips.update(id, change)
}

/** Deleting a trip removes its points and waypoints in the same transaction, so nothing is left behind. */
export async function deleteTrip(database: GeoTraceDb, id: string): Promise<void> {
  await database.transaction('rw', database.trips, database.points, database.waypoints, async () => {
    await database.points.where('tripId').equals(id).delete()
    await database.waypoints.where('tripId').equals(id).delete()
    await database.trips.delete(id)
  })
}

export interface NewWaypoint {
  tripId: string
  lat: number
  lng: number
  note: string
  photo: Blob | null
}

export async function addWaypoint(database: GeoTraceDb, input: NewWaypoint, now: Date = new Date()): Promise<Waypoint | null> {
  const trip = await database.trips.get(input.tripId)
  if (!trip) return null
  const waypoint: Waypoint = { id: crypto.randomUUID(), ...input, note: input.note.trim().slice(0, 1000), createdAt: now.toISOString() }
  await database.waypoints.add(waypoint)
  return waypoint
}

export async function updateWaypoint(database: GeoTraceDb, id: string, patch: Partial<Pick<Waypoint, 'note' | 'photo'>>): Promise<void> {
  const change = { ...patch }
  if (change.note !== undefined) change.note = change.note.trim().slice(0, 1000)
  await database.waypoints.update(id, change)
}

export async function deleteWaypoint(database: GeoTraceDb, id: string): Promise<void> {
  await database.waypoints.delete(id)
}

/**
 * Adds the demo trips only if there are no trips at all, and decides that inside the same transaction that writes
 * them. The demo is built in the background shortly after launch, so by the time it is ready the user may already have
 * started recording; it must never overwrite or remove anything. Returns whether it added the demo.
 */
export async function seedIfEmpty(database: GeoTraceDb, trips: readonly Trip[], points: readonly TrackPoint[], waypoints: readonly Waypoint[]): Promise<boolean> {
  return database.transaction('rw', database.trips, database.points, database.waypoints, async () => {
    if ((await database.trips.count()) > 0) return false
    await database.trips.bulkPut([...trips])
    await database.points.bulkAdd([...points])
    await database.waypoints.bulkPut([...waypoints])
    return true
  })
}

/** Replaces everything in one transaction: all of it is swapped or none of it is. Only for the explicit "load demo" action. */
export async function replaceAll(database: GeoTraceDb, trips: readonly Trip[], points: readonly TrackPoint[], waypoints: readonly Waypoint[]): Promise<void> {
  await database.transaction('rw', database.trips, database.points, database.waypoints, async () => {
    await database.trips.clear()
    await database.points.clear()
    await database.waypoints.clear()
    await database.trips.bulkPut([...trips])
    await database.points.bulkAdd([...points])
    await database.waypoints.bulkPut([...waypoints])
  })
}
