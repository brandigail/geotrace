import { describe, expect, it } from 'vitest'
import { averageSpeedKmh, fileStem, formatDistance, formatDuration, formatElevation, formatPace, formatSpeed, formatWhen } from './format'

describe('formatDistance', () => {
  it.each([
    [0, '0 m'],
    [842.4, '842 m'],
    [999.6, '1000 m'],
    [1000, '1.00 km'],
    [4523, '4.52 km'],
    [12_340, '12.3 km'],
  ])('shows %d m as %s', (metres, text) => {
    expect(formatDistance(metres)).toBe(text)
  })

  it('shows 0 m for nonsense', () => {
    expect(formatDistance(-5)).toBe('0 m')
    expect(formatDistance(Number.NaN)).toBe('0 m')
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [59, '0:59'],
    [754, '12:34'],
    [3723, '1:02:03'],
    [-3, '0:00'],
  ])('shows %d s as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })
})

describe('speed and pace', () => {
  it('works out the average speed and refuses to divide by nothing', () => {
    expect(averageSpeedKmh(10_000, 3600)).toBe(10)
    expect(averageSpeedKmh(5000, 0)).toBeNull()
    expect(averageSpeedKmh(0, 600)).toBeNull()
  })

  it('formats speed and pace', () => {
    expect(formatSpeed(12.34)).toBe('12.3 km/h')
    expect(formatSpeed(null)).toBe('–')
    expect(formatPace(10)).toBe('6:00 /km')
    expect(formatPace(11)).toBe('5:27 /km')
    expect(formatPace(null)).toBe('–')
    expect(formatPace(0.2)).toBe('–')
  })
})

describe('other formats', () => {
  it('formats elevation, dates and file names', () => {
    expect(formatElevation(1084.6)).toBe('1085 m')
    expect(formatWhen(new Date(2026, 10, 3, 9, 5).toISOString())).toBe('3 Nov 2026, 09:05')
    expect(formatWhen('nonsense')).toBe('')
    expect(fileStem('Snowdon: Llanberis Path!')).toBe('snowdon-llanberis-path')
    expect(fileStem('Étoile à Paris')).toBe('etoile-a-paris')
    expect(fileStem('???')).toBe('trip')
  })
})
