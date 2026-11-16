import { describe, expect, it } from 'vitest'
import { toGpx, waypointName } from './gpx'
import { assertWellFormed, point, trip, waypoint } from './testing'

const track = [
  point(-33.9, 18.4, { ts: Date.UTC(2026, 10, 16, 7, 30, 0), altM: 12.34 }),
  point(-33.9005, 18.4005, { ts: Date.UTC(2026, 10, 16, 7, 30, 10), altM: null }),
  point(-33.901, 18.401, { ts: Date.UTC(2026, 10, 16, 7, 40, 0), altM: 15, seg: 1 }),
]

describe('toGpx', () => {
  const gpx = toGpx(trip(), track, [waypoint()])

  it('is well-formed GPX 1.1 with the right namespace and creator', () => {
    expect(assertWellFormed(gpx)).toBe('gpx')
    expect(gpx).toContain('<gpx version="1.1" creator="GeoTrace" xmlns="http://www.topografix.com/GPX/1/1">')
    expect(gpx.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('writes every point with six decimal places, in UTC, and altitude only when known', () => {
    expect(gpx).toContain('<trkpt lat="-33.900000" lon="18.400000">')
    expect(gpx).toContain('<ele>12.3</ele>')
    expect(gpx).toContain('<time>2026-11-16T07:30:00Z</time>')
    expect(gpx.match(/<ele>/g)).toHaveLength(2)
    expect(gpx.match(/<trkpt /g)).toHaveLength(3)
  })

  it('puts a pause in a new segment instead of joining it up', () => {
    expect(gpx.match(/<trkseg>/g)).toHaveLength(2)
    expect(gpx.match(/<\/trkseg>/g)).toHaveLength(2)
  })

  it('lists waypoints before the track, as the schema requires, with name, time and description', () => {
    expect(gpx.indexOf('<wpt')).toBeGreaterThan(-1)
    expect(gpx.indexOf('<wpt')).toBeLessThan(gpx.indexOf('<trk>'))
    expect(gpx).toContain('<wpt lat="-33.900000" lon="18.400000">')
    expect(gpx).toContain('<name>Nice view</name>')
    expect(gpx).toContain('<desc>Nice view</desc>')
  })

  it('keeps time before name inside a waypoint, which the schema also requires', () => {
    const wpt = gpx.slice(gpx.indexOf('<wpt'), gpx.indexOf('</wpt>'))
    expect(wpt.indexOf('<time>')).toBeLessThan(wpt.indexOf('<name>'))
    expect(wpt.indexOf('<name>')).toBeLessThan(wpt.indexOf('<desc>'))
  })

  it('escapes special characters in the trip name and notes, and removes illegal control characters', () => {
    const nasty = toGpx(trip({ name: 'Tom & Jerry\'s <hike> "2026"' }), track, [waypoint({ note: 'Use "A" & B\u0007\u0000 <here>' })])
    expect(assertWellFormed(nasty)).toBe('gpx')
    expect(nasty).toContain('Tom &amp; Jerry&apos;s &lt;hike&gt; &quot;2026&quot;')
    expect(nasty).toContain('Use &quot;A&quot; &amp; B &lt;here&gt;')
    expect(nasty).not.toContain('\u0007')
  })

  it('works with no points and no waypoints', () => {
    const empty = toGpx(trip(), [], [])
    expect(assertWellFormed(empty)).toBe('gpx')
    expect(empty).not.toContain('<trkseg>')
    expect(empty).not.toContain('<wpt')
  })

  it('sorts waypoints by when they were dropped and numbers unnamed ones', () => {
    const out = toGpx(trip(), track, [waypoint({ id: 'b', note: '', createdAt: '2026-11-16T08:00:00.000Z' }), waypoint({ id: 'a', note: 'First', createdAt: '2026-11-16T07:35:00.000Z' })])
    expect(out.indexOf('<name>First</name>')).toBeLessThan(out.indexOf('<name>Waypoint 2</name>'))
  })
})

describe('waypointName', () => {
  it('uses the first non-empty line, shortened, or a number', () => {
    expect(waypointName('\n  Water stop  \nrefill here', 0)).toBe('Water stop')
    expect(waypointName('x'.repeat(80), 0)).toHaveLength(40)
    expect(waypointName('   ', 4)).toBe('Waypoint 5')
  })
})
