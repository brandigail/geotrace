import type { TrackPoint, Trip, Waypoint } from '../types'
import { segmentsOf } from './geo'
import { coordinate, isoUtc, xmlEscape } from './xml'

/** A waypoint's name is the first line of its note, shortened, or "Waypoint 3" when the note is empty. */
export function waypointName(note: string, index: number): string {
  const firstLine = note.split(/\r?\n/).find((line) => line.trim()) ?? ''
  const trimmed = firstLine.trim()
  return trimmed ? (trimmed.length > 40 ? `${trimmed.slice(0, 39)}…` : trimmed) : `Waypoint ${index + 1}`
}

/**
 * GPX 1.1, the format almost every mapping and fitness tool reads. Waypoints come first (as the schema requires), then
 * one track with one segment per recording segment, so a pause is not joined up as if you had travelled.
 */
export function toGpx(trip: Trip, points: readonly TrackPoint[], waypoints: readonly Waypoint[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="GeoTrace" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <metadata>',
    `    <name>${xmlEscape(trip.name)}</name>`,
    `    <time>${isoUtc(Date.parse(trip.startedAt))}</time>`,
    '  </metadata>',
  ]

  const ordered = [...waypoints].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  ordered.forEach((wp, i) => {
    lines.push(`  <wpt lat="${coordinate(wp.lat)}" lon="${coordinate(wp.lng)}">`)
    lines.push(`    <time>${isoUtc(Date.parse(wp.createdAt))}</time>`)
    lines.push(`    <name>${xmlEscape(waypointName(wp.note, i))}</name>`)
    if (wp.note.trim()) lines.push(`    <desc>${xmlEscape(wp.note.trim())}</desc>`)
    lines.push('  </wpt>')
  })

  lines.push('  <trk>', `    <name>${xmlEscape(trip.name)}</name>`)
  for (const segment of segmentsOf(points)) {
    lines.push('    <trkseg>')
    for (const p of segment) {
      lines.push(`      <trkpt lat="${coordinate(p.lat)}" lon="${coordinate(p.lng)}">`)
      if (p.altM !== null && Number.isFinite(p.altM)) lines.push(`        <ele>${p.altM.toFixed(1)}</ele>`)
      lines.push(`        <time>${isoUtc(p.ts)}</time>`, '      </trkpt>')
    }
    lines.push('    </trkseg>')
  }
  lines.push('  </trk>', '</gpx>')
  return `${lines.join('\n')}\n`
}
