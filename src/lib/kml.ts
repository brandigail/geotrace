import type { TrackPoint, Trip, Waypoint } from '../types'
import { segmentsOf } from './geo'
import { waypointName } from './gpx'
import { coordinate, isoUtc, xmlEscape } from './xml'

/** KML wants longitude first, then latitude, then altitude in metres. */
function tuple(lat: number, lng: number, altM: number | null): string {
  return `${coordinate(lng)},${coordinate(lat)},${altM !== null && Number.isFinite(altM) ? altM.toFixed(1) : '0'}`
}

/** KML 2.2 for Google Earth and others: the track as a line (one per segment, so pauses are not joined) and each waypoint as a pin. */
export function toKml(trip: Trip, points: readonly TrackPoint[], waypoints: readonly Waypoint[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '  <Document>',
    `    <name>${xmlEscape(trip.name)}</name>`,
    '    <Style id="track">',
    '      <LineStyle><color>ff766e0f</color><width>4</width></LineStyle>',
    '    </Style>',
    '    <Placemark>',
    `      <name>${xmlEscape(trip.name)}</name>`,
    '      <styleUrl>#track</styleUrl>',
    '      <MultiGeometry>',
  ]
  for (const segment of segmentsOf(points)) {
    lines.push('        <LineString>', '          <tessellate>1</tessellate>', '          <altitudeMode>clampToGround</altitudeMode>')
    lines.push(`          <coordinates>${segment.map((p) => tuple(p.lat, p.lng, p.altM)).join(' ')}</coordinates>`, '        </LineString>')
  }
  lines.push('      </MultiGeometry>', '    </Placemark>')

  const ordered = [...waypoints].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  ordered.forEach((wp, i) => {
    lines.push('    <Placemark>', `      <name>${xmlEscape(waypointName(wp.note, i))}</name>`)
    if (wp.note.trim()) lines.push(`      <description>${xmlEscape(wp.note.trim())}</description>`)
    lines.push(`      <TimeStamp><when>${isoUtc(Date.parse(wp.createdAt))}</when></TimeStamp>`, `      <Point><coordinates>${tuple(wp.lat, wp.lng, null)}</coordinates></Point>`, '    </Placemark>')
  })

  lines.push('  </Document>', '</kml>')
  return `${lines.join('\n')}\n`
}
