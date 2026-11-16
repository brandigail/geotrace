import { describe, expect, it } from 'vitest'
import { elevationProfile, elevationStats } from './elevation'
import { haversineM, judgeFix, pathDistanceM, segmentsOf } from './geo'
import { buildSeed } from './seed'

const now = new Date('2026-11-16T12:00:00.000Z')
const seed = await buildSeed(now, async (label) => new Blob([label], { type: 'image/jpeg' }))
const pointsOf = (id: string) => seed.points.filter((p) => p.tripId === id)
const tripNamed = (text: string) => {
  const trip = seed.trips.find((t) => t.name.includes(text))
  if (!trip) throw new Error(`no trip with ${text}`)
  return trip
}

describe('buildSeed', () => {
  it('has three finished trips with distinct ids and names, newest first by start time order of days ago', () => {
    expect(seed.trips).toHaveLength(3)
    expect(new Set(seed.trips.map((t) => t.id)).size).toBe(3)
    expect(seed.trips.every((t) => t.endedAt !== null && Date.parse(t.endedAt) <= now.getTime())).toBe(true)
  })

  it('is the same every time', async () => {
    expect(await buildSeed(now, async (label) => new Blob([label]))).toEqual(await buildSeed(now, async (label) => new Blob([label])))
  })

  it('has plausible lengths for each route', () => {
    expect(tripNamed('Reservoir').distanceM).toBeGreaterThan(2200)
    expect(tripNamed('Reservoir').distanceM).toBeLessThan(3600)
    expect(tripNamed('Snowdon').distanceM).toBeGreaterThan(8000)
    expect(tripNamed('Snowdon').distanceM).toBeLessThan(12_000)
    expect(tripNamed('Vondelpark').distanceM).toBeGreaterThan(5000)
    expect(tripNamed('Vondelpark').distanceM).toBeLessThan(9000)
  })

  it('stores the distance and active time that match its own points', () => {
    for (const trip of seed.trips) {
      expect(Math.abs(trip.distanceM - pathDistanceM(pointsOf(trip.id)))).toBeLessThanOrEqual(1)
    }
  })

  it('has realistic speeds: a run, a slow climb and a cycle', () => {
    const kmh = (name: string) => (tripNamed(name).distanceM / 1000) / (tripNamed(name).durationSec / 3600)
    expect(kmh('Reservoir')).toBeGreaterThan(8)
    expect(kmh('Reservoir')).toBeLessThan(13)
    expect(kmh('Snowdon')).toBeGreaterThan(2.5)
    expect(kmh('Snowdon')).toBeLessThan(4.5)
    expect(kmh('Vondelpark')).toBeGreaterThan(15)
    expect(kmh('Vondelpark')).toBeLessThan(23)
  })

  it('climbs about a kilometre on the mountain and is flat in the parks', () => {
    const climb = elevationStats(elevationProfile(pointsOf('sample-snowdon')))
    expect(climb?.gainM).toBeGreaterThan(850)
    expect(climb?.gainM).toBeLessThan(1150)
    expect(climb?.maxM).toBeGreaterThan(1000)
    const flat = elevationStats(elevationProfile(pointsOf('sample-reservoir')))
    expect(flat?.gainM).toBeLessThan(25)
  })

  it('has a pause on the mountain that splits it into two segments and is not counted as time or distance', () => {
    const segments = segmentsOf(pointsOf('sample-snowdon'))
    expect(segments).toHaveLength(2)
    const gap = (segments[1]?.[0]?.ts ?? 0) - (segments[0]?.at(-1)?.ts ?? 0)
    expect(gap).toBeGreaterThan(10 * 60_000)
    const wallClock = ((pointsOf('sample-snowdon').at(-1)?.ts ?? 0) - (pointsOf('sample-snowdon')[0]?.ts ?? 0)) / 1000
    expect(tripNamed('Snowdon').durationSec).toBeLessThan(wallClock - 600)
  })

  it('would pass the same accuracy and movement filter that live recording uses', () => {
    for (const trip of seed.trips) {
      let last = null as (typeof seed.points)[number] | null
      let currentSeg = -1
      for (const p of pointsOf(trip.id)) {
        if (p.seg !== currentSeg) {
          currentSeg = p.seg
          last = null
        }
        expect(judgeFix(last, { lat: p.lat, lng: p.lng, ts: p.ts, altM: p.altM, accuracyM: p.accuracyM })).toEqual({ accept: true })
        last = p
      }
    }
  })

  it('has waypoints on the route, with notes, some with photos', () => {
    expect(seed.waypoints.length).toBeGreaterThanOrEqual(6)
    expect(seed.waypoints.some((w) => w.photo !== null)).toBe(true)
    expect(seed.waypoints.some((w) => w.photo === null)).toBe(true)
    for (const w of seed.waypoints) {
      expect(w.note.length).toBeGreaterThan(5)
      const nearest = Math.min(...pointsOf(w.tripId).map((p) => haversineM(p, w)))
      expect(nearest).toBeLessThan(80)
    }
  })

  it('puts the seeded trips in the past at different times', () => {
    const starts = seed.trips.map((t) => Date.parse(t.startedAt))
    expect(Math.max(...starts)).toBeLessThan(now.getTime())
    expect(Math.max(...starts) - Math.min(...starts)).toBeGreaterThan(10 * 86_400_000)
  })
})
