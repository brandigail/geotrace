import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { addPoint, addWaypoint, createTrip, defaultName, deleteTrip, deleteWaypoint, GeoTraceDb, pointsOf, replaceAll, seedIfEmpty, updateTrip, updateWaypoint } from './db'
import { buildSeed } from './seed'
import { point } from './testing'

let database: GeoTraceDb
let counter = 0

beforeEach(() => {
  database = new GeoTraceDb(`test-${counter++}`)
})

describe('trips and points', () => {
  it('creates an unfinished trip with a default name', async () => {
    const trip = await createTrip(database, '  ', new Date(2026, 10, 16, 14, 32))
    expect(await database.trips.get(trip.id)).toMatchObject({ name: 'Trip 16 Nov, 14:32', endedAt: null, distanceM: 0, durationSec: 0 })
    expect(defaultName(new Date(2026, 0, 5, 9, 5))).toBe('Trip 5 Jan, 09:05')
  })

  it('returns a trip\'s points in recorded order whatever order they were saved in', async () => {
    const trip = await createTrip(database, 'T')
    await addPoint(database, point(0, 0, { tripId: trip.id, ts: 3000, seg: 0 }))
    await addPoint(database, point(0, 0, { tripId: trip.id, ts: 1000, seg: 0 }))
    await addPoint(database, point(0, 0, { tripId: trip.id, ts: 500, seg: 1 }))
    await addPoint(database, point(0, 0, { tripId: 'other', ts: 1, seg: 0 }))
    expect((await pointsOf(database, trip.id)).map((p) => [p.seg, p.ts])).toEqual([[0, 1000], [0, 3000], [1, 500]])
  })

  it('updates only the fields given, and keeps the old name when the new one is blank', async () => {
    const trip = await createTrip(database, 'Keep me')
    await updateTrip(database, trip.id, { distanceM: 1234, durationSec: 600 })
    await updateTrip(database, trip.id, { name: '   ' })
    expect(await database.trips.get(trip.id)).toMatchObject({ name: 'Keep me', distanceM: 1234, durationSec: 600 })
    await updateTrip(database, trip.id, { name: '  Hill   walk ', endedAt: '2026-11-16T10:00:00.000Z' })
    expect(await database.trips.get(trip.id)).toMatchObject({ name: 'Hill walk', endedAt: '2026-11-16T10:00:00.000Z' })
  })
})

describe('waypoints', () => {
  it('adds, edits and deletes a waypoint with a photo', async () => {
    const trip = await createTrip(database, 'T')
    const photo = new Blob(['jpeg'], { type: 'image/jpeg' })
    const wp = await addWaypoint(database, { tripId: trip.id, lat: 1, lng: 2, note: '  View  ', photo })
    expect(wp).toMatchObject({ note: 'View', lat: 1, lng: 2 })
    expect((await database.waypoints.get(wp?.id ?? ''))?.photo?.size).toBe(4)
    await updateWaypoint(database, wp?.id ?? '', { note: ' Better view ', photo: null })
    expect(await database.waypoints.get(wp?.id ?? '')).toMatchObject({ note: 'Better view', photo: null })
    await deleteWaypoint(database, wp?.id ?? '')
    expect(await database.waypoints.count()).toBe(0)
  })

  it('refuses a waypoint for a trip that does not exist', async () => {
    expect(await addWaypoint(database, { tripId: 'nope', lat: 0, lng: 0, note: 'x', photo: null })).toBeNull()
  })
})

describe('deleteTrip', () => {
  it('removes the trip with its points and waypoints and leaves other trips alone', async () => {
    const a = await createTrip(database, 'A')
    const b = await createTrip(database, 'B')
    for (const t of [a, b]) {
      await addPoint(database, point(0, 0, { tripId: t.id }))
      await addWaypoint(database, { tripId: t.id, lat: 0, lng: 0, note: 'x', photo: null })
    }
    await deleteTrip(database, a.id)
    expect((await database.trips.toArray()).map((t) => t.id)).toEqual([b.id])
    expect((await database.points.toArray()).map((p) => p.tripId)).toEqual([b.id])
    expect((await database.waypoints.toArray()).map((w) => w.tripId)).toEqual([b.id])
  })
})

describe('seedIfEmpty', () => {
  const demo = () => buildSeed(new Date(), async () => new Blob(['p']))

  it('adds the demo trips to an empty database', async () => {
    const seed = await demo()
    expect(await seedIfEmpty(database, seed.trips, seed.points, seed.waypoints)).toBe(true)
    expect(await database.trips.count()).toBe(3)
    expect(await database.points.count()).toBe(seed.points.length)
  })

  it('never touches a database that already has a trip, such as one recorded while the demo was being built', async () => {
    const live = await createTrip(database, 'Recording right now')
    await addPoint(database, point(1, 1, { tripId: live.id }))
    const seed = await demo()
    expect(await seedIfEmpty(database, seed.trips, seed.points, seed.waypoints)).toBe(false)
    expect((await database.trips.toArray()).map((t) => t.id)).toEqual([live.id])
    expect(await database.points.count()).toBe(1)
    expect(await database.waypoints.count()).toBe(0)
  })

  it('cannot be raced into adding the demo twice', async () => {
    const seed = await demo()
    const results = await Promise.all([seedIfEmpty(database, seed.trips, seed.points, seed.waypoints), seedIfEmpty(database, seed.trips, seed.points, seed.waypoints)])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await database.points.count()).toBe(seed.points.length)
  })
})

describe('replaceAll', () => {
  it('swaps in the demo data at once, including photos', async () => {
    await createTrip(database, 'old')
    const seed = await buildSeed(new Date(), async () => new Blob(['p']))
    await replaceAll(database, seed.trips, seed.points, seed.waypoints)
    expect(await database.trips.count()).toBe(3)
    expect(await database.points.count()).toBe(seed.points.length)
    expect((await database.waypoints.toArray()).filter((w) => w.photo).length).toBeGreaterThan(0)
  })
})
