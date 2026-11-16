import { describe, expect, it } from 'vitest'
import { activeSeconds, boundsOf, haversineM, isValidCoordinate, judgeFix, MAX_ACCURACY_M, MIN_MOVE_M, pathDistanceM, segmentsOf } from './geo'
import { point } from './testing'

describe('haversineM', () => {
  it('is zero for the same point', () => {
    expect(haversineM({ lat: 51.5, lng: -0.12 }, { lat: 51.5, lng: -0.12 })).toBe(0)
  })

  it('matches known distances', () => {
    // London to Paris is about 343.5 km; one degree of latitude is about 111.2 km; a degree of longitude at 60N is half of that.
    expect(haversineM({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 }) / 1000).toBeCloseTo(343.5, 0)
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1)
    expect(haversineM({ lat: 60, lng: 0 }, { lat: 60, lng: 1 })).toBeCloseTo(55_597, -1)
  })

  it('is symmetric and works across the date line and the poles', () => {
    const a = { lat: 10, lng: 179.9 }
    const b = { lat: 10, lng: -179.9 }
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 6)
    expect(haversineM(a, b)).toBeLessThan(25_000)
    expect(haversineM({ lat: 90, lng: 0 }, { lat: 90, lng: 90 })).toBeCloseTo(0, 3)
    expect(haversineM({ lat: 90, lng: 0 }, { lat: -90, lng: 0 }) / 1000).toBeCloseTo(20_015, -1)
  })
})

describe('pathDistanceM', () => {
  it('adds up the legs of a track', () => {
    const track = [point(0, 0), point(0.001, 0), point(0.002, 0)]
    expect(pathDistanceM(track)).toBeCloseTo(222.4, 0)
  })

  it('never joins the end of one segment to the start of the next', () => {
    const track = [point(0, 0, { seg: 0 }), point(0.001, 0, { seg: 0 }), point(1, 1, { seg: 1 }), point(1.001, 1, { seg: 1 })]
    expect(pathDistanceM(track)).toBeCloseTo(111.2 + 111.2, 0)
  })

  it('is zero for no points or one point', () => {
    expect(pathDistanceM([])).toBe(0)
    expect(pathDistanceM([point(1, 1)])).toBe(0)
  })
})

describe('isValidCoordinate', () => {
  it('accepts real positions and rejects impossible ones', () => {
    expect(isValidCoordinate({ lat: -33.9, lng: 18.4 })).toBe(true)
    expect(isValidCoordinate({ lat: 91, lng: 0 })).toBe(false)
    expect(isValidCoordinate({ lat: 0, lng: -181 })).toBe(false)
    expect(isValidCoordinate({ lat: Number.NaN, lng: 0 })).toBe(false)
  })
})

describe('judgeFix', () => {
  const start = point(51.5, -0.12, { ts: 1_000_000 })
  const fix = (lat: number, lng: number, extra: Partial<{ ts: number; accuracyM: number }> = {}) => ({ lat, lng, ts: 1_010_000, altM: null, accuracyM: 8, ...extra })
  // About 11 m north of the start.
  const eleven = 51.5 + 0.0001

  it('accepts the first good reading', () => {
    expect(judgeFix(null, fix(51.5, -0.12))).toEqual({ accept: true })
  })

  it('rejects a poor reading, even for the first point', () => {
    expect(judgeFix(null, fix(51.5, -0.12, { accuracyM: MAX_ACCURACY_M + 1 }))).toEqual({ accept: false, reason: 'inaccurate' })
    expect(judgeFix(start, fix(eleven, -0.12, { accuracyM: 120 }))).toEqual({ accept: false, reason: 'inaccurate' })
    expect(judgeFix(null, fix(51.5, -0.12, { accuracyM: MAX_ACCURACY_M })).accept).toBe(true)
  })

  it('rejects nonsense positions and times', () => {
    expect(judgeFix(null, fix(Number.NaN, 0))).toEqual({ accept: false, reason: 'invalid' })
    expect(judgeFix(null, fix(95, 0))).toEqual({ accept: false, reason: 'invalid' })
    expect(judgeFix(null, fix(51.5, -0.12, { ts: Number.NaN }))).toEqual({ accept: false, reason: 'invalid' })
    expect(judgeFix(null, fix(51.5, -0.12, { accuracyM: Number.NaN }))).toEqual({ accept: false, reason: 'inaccurate' })
  })

  it('rejects a reading that barely moved, but accepts one that moved enough', () => {
    expect(judgeFix(start, fix(51.50002, -0.12))).toEqual({ accept: false, reason: 'too-close' })
    expect(judgeFix(start, fix(eleven, -0.12)).accept).toBe(true)
    expect(MIN_MOVE_M).toBe(5)
  })

  it('rejects a reading that is not newer than the last', () => {
    expect(judgeFix(start, fix(eleven, -0.12, { ts: 1_000_000 }))).toEqual({ accept: false, reason: 'out-of-order' })
    expect(judgeFix(start, fix(eleven, -0.12, { ts: 999_000 }))).toEqual({ accept: false, reason: 'out-of-order' })
  })

  it('rejects an impossible jump but accepts the same distance over enough time', () => {
    const farAway = fix(51.6, -0.12, { ts: 1_001_000 }) // about 11 km in one second
    expect(judgeFix(start, farAway)).toEqual({ accept: false, reason: 'jump' })
    expect(judgeFix(start, { ...farAway, ts: 1_000_000 + 600_000 }).accept).toBe(true)
  })

  it('compares with the last kept point, so slow walking still builds up', () => {
    let last = start
    let kept = 0
    // 1.4 m per second for a minute: each reading is under 5 m from the previous one, but they add up.
    for (let s = 1; s <= 60; s++) {
      const candidate = fix(51.5 + (s * 1.4) / 111_195, -0.12, { ts: 1_000_000 + s * 1000 })
      if (judgeFix(last, candidate).accept) {
        kept++
        last = point(candidate.lat, candidate.lng, { ts: candidate.ts })
      }
    }
    expect(kept).toBeGreaterThanOrEqual(10)
    expect(haversineM(start, last)).toBeGreaterThan(70)
  })
})

describe('boundsOf', () => {
  it('returns the south-west and north-east corners', () => {
    expect(boundsOf([{ lat: 1, lng: 5 }, { lat: -2, lng: 7 }, { lat: 0, lng: 3 }])).toEqual([[-2, 3], [1, 7]])
  })

  it('is null for no points', () => {
    expect(boundsOf([])).toBeNull()
  })
})

describe('segmentsOf and activeSeconds', () => {
  const track = [point(0, 0, { seg: 1, ts: 5000 }), point(0, 0, { seg: 0, ts: 2000 }), point(0, 0, { seg: 0, ts: 1000 }), point(0, 0, { seg: 1, ts: 9000 })]

  it('groups by segment in order and sorts each by time', () => {
    const segments = segmentsOf(track)
    expect(segments.map((s) => s.map((p) => p.ts))).toEqual([[1000, 2000], [5000, 9000]])
  })

  it('counts only time inside segments, never the pause between them', () => {
    // 1 s in the first segment and 4 s in the second; the 3 s gap between them does not count.
    expect(activeSeconds(track)).toBe(5)
    expect(activeSeconds([])).toBe(0)
  })
})
