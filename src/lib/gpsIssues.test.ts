import { describe, expect, it } from 'vitest'
import { GPS_MESSAGES, gpsIssueKind, isFatal } from './gpsIssues'

describe('gpsIssueKind', () => {
  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
    [0, 'unavailable'],
    [99, 'unavailable'],
  ])('maps error code %d to %s', (code, kind) => {
    expect(gpsIssueKind(code)).toBe(kind)
  })
})

describe('isFatal', () => {
  it('only treats a denial or a missing capability as final', () => {
    expect(isFatal('denied')).toBe(true)
    expect(isFatal('unsupported')).toBe(true)
    expect(isFatal('insecure')).toBe(true)
    expect(isFatal('unavailable')).toBe(false)
    expect(isFatal('timeout')).toBe(false)
  })
})

describe('GPS_MESSAGES', () => {
  it('has a clear message for every kind, and tells the user how to fix a block', () => {
    for (const kind of ['unsupported', 'insecure', 'denied', 'unavailable', 'timeout'] as const) expect(GPS_MESSAGES[kind].length).toBeGreaterThan(20)
    expect(GPS_MESSAGES.denied).toMatch(/allow/i)
  })
})
