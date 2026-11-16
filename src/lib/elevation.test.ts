import { describe, expect, it } from 'vitest'
import { CLIMB_THRESHOLD_M, elevationProfile, elevationStats, smooth } from './elevation'
import { point } from './testing'

// Points 0.001 degrees of latitude apart are about 111 m apart.
const climb = (altitudes: (number | null)[], seg = 0) => altitudes.map((altM, i) => point(i * 0.001, 0, { altM, seg, ts: 1_000_000 + i * 10_000 }))

describe('smooth', () => {
  it('averages each value with its neighbours and keeps the length', () => {
    expect(smooth([0, 10, 0, 10, 0], 3)).toEqual([5, 10 / 3, 20 / 3, 10 / 3, 5])
    expect(smooth([4], 5)).toEqual([4])
    expect(smooth([], 5)).toEqual([])
  })
})

describe('elevationProfile', () => {
  it('pairs distance travelled with smoothed altitude', () => {
    const profile = elevationProfile(climb([100, 110, 120, 130, 140]))
    expect(profile).toHaveLength(5)
    expect(profile[0]?.distanceM).toBe(0)
    expect(profile.at(-1)?.distanceM).toBeCloseTo(444.8, 0)
    expect(profile.at(-1)?.altM).toBeGreaterThan(125)
  })

  it('skips points with no altitude but still counts their distance', () => {
    const profile = elevationProfile(climb([100, null, 120]))
    expect(profile).toHaveLength(2)
    expect(profile[1]?.distanceM).toBeCloseTo(222.4, 0)
  })

  it('gives nothing when there are fewer than two altitudes', () => {
    expect(elevationProfile(climb([null, null, null]))).toEqual([])
    expect(elevationProfile(climb([100, null, null]))).toEqual([])
    expect(elevationProfile([])).toEqual([])
  })

  it('does not count the pause between segments as distance', () => {
    const track = [...climb([100, 110], 0), ...climb([110, 120], 1).map((p) => ({ ...p, lat: p.lat + 5 }))]
    expect(elevationProfile(track).at(-1)?.distanceM).toBeCloseTo(111.2 * 2, 0)
  })
})

describe('elevationStats', () => {
  const samples = (altitudes: number[]) => altitudes.map((altM, i) => ({ distanceM: i * 100, altM }))

  it('adds up climbing and descending and finds the extremes', () => {
    expect(elevationStats(samples([100, 110, 130, 120, 100, 105]))).toMatchObject({ gainM: 30 + 5, lossM: 10 + 20, minM: 100, maxM: 130 })
  })

  it('ignores wobbles smaller than the threshold in both directions', () => {
    const wobble = Array.from({ length: 40 }, (_, i) => 100 + (i % 2 ? 1.2 : -1.2))
    expect(elevationStats(samples(wobble))).toMatchObject({ gainM: 0, lossM: 0 })
    expect(CLIMB_THRESHOLD_M).toBe(3)
  })

  it('still counts a slow steady climb made of small steps', () => {
    const slow = Array.from({ length: 21 }, (_, i) => 100 + i) // 1 m per sample, 20 m in all
    const stats = elevationStats(samples(slow))
    expect(stats?.gainM).toBeGreaterThanOrEqual(18)
    expect(stats?.lossM).toBe(0)
  })

  it('is null for no data', () => {
    expect(elevationStats([])).toBeNull()
  })
})
