import { describe, expect, it } from 'vitest'
import { toKml } from './kml'
import { assertWellFormed, point, trip, waypoint } from './testing'

const track = [
  point(-33.9, 18.4, { ts: 1000, altM: 12.34 }),
  point(-33.9005, 18.4005, { ts: 2000, altM: null }),
  point(-33.901, 18.401, { ts: 90_000, altM: 15, seg: 1 }),
]

describe('toKml', () => {
  const kml = toKml(trip(), track, [waypoint()])

  it('is well-formed KML 2.2', () => {
    expect(assertWellFormed(kml)).toBe('kml')
    expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">')
  })

  it('writes coordinates as longitude, latitude, altitude (the reverse of GPX order)', () => {
    expect(kml).toContain('18.400000,-33.900000,12.3')
    expect(kml).toContain('18.400500,-33.900500,0')
  })

  it('draws one line per segment so a pause is not joined up', () => {
    expect(kml.match(/<LineString>/g)).toHaveLength(2)
    const first = kml.slice(kml.indexOf('<coordinates>'), kml.indexOf('</coordinates>'))
    expect(first.trim().split(/\s+/)).toHaveLength(2)
  })

  it('adds each waypoint as a pin with its name, note and time', () => {
    expect(kml).toContain('<name>Nice view</name>')
    expect(kml).toContain('<description>Nice view</description>')
    expect(kml).toContain('<when>2026-11-16T07:45:00Z</when>')
    expect(kml).toContain('<Point><coordinates>18.400000,-33.900000,0</coordinates></Point>')
  })

  it('escapes special characters and removes illegal control characters', () => {
    const nasty = toKml(trip({ name: 'A & B <c>' }), track, [waypoint({ note: 'It\'s "fine" & <ok>\u0003' })])
    expect(assertWellFormed(nasty)).toBe('kml')
    expect(nasty).toContain('A &amp; B &lt;c&gt;')
    expect(nasty).toContain('It&apos;s &quot;fine&quot; &amp; &lt;ok&gt;')
    expect(nasty).not.toContain('\u0003')
  })

  it('works with no points and no waypoints', () => {
    const empty = toKml(trip(), [], [])
    expect(assertWellFormed(empty)).toBe('kml')
    expect(empty).not.toContain('<LineString>')
    expect(empty.match(/<Placemark>/g)).toHaveLength(1)
  })
})
