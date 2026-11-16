import type { TrackPoint, Trip, Waypoint } from '../types'

/** Small builders shared by the tests. Not used by the app. */
export function point(lat: number, lng: number, extra: Partial<TrackPoint> = {}): TrackPoint {
  return { tripId: 't1', ts: 1_700_000_000_000, lat, lng, altM: null, accuracyM: 5, seg: 0, ...extra }
}

export function trip(extra: Partial<Trip> = {}): Trip {
  return { id: 't1', name: 'Morning walk', startedAt: '2026-11-16T07:30:00.000Z', endedAt: '2026-11-16T08:15:00.000Z', distanceM: 1000, durationSec: 2700, ...extra }
}

export function waypoint(extra: Partial<Waypoint> = {}): Waypoint {
  return { id: 'w1', tripId: 't1', lat: -33.9, lng: 18.4, note: 'Nice view', photo: null, createdAt: '2026-11-16T07:45:00.000Z', ...extra }
}

/**
 * A minimal check that a document is well-formed XML: tags open and close in order, attributes are quoted, ampersands
 * are escaped and there is exactly one root element with nothing after it. It does not understand schemas, only that
 * a real parser would not choke on the structure. Returns the root element's name.
 */
export function assertWellFormed(xml: string): string {
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, '').trimEnd()
  const token = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|([^<]+)/gy
  const stack: string[] = []
  let root = ''
  let consumed = 0
  for (const match of body.matchAll(token)) {
    consumed = (match.index ?? 0) + match[0].length
    const [, closing, name = '', , selfClosing, text] = match
    if (text !== undefined) {
      if (stack.length === 0 && text.trim()) throw new Error(`Text outside the root element: ${text.slice(0, 30)}`)
      if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(text)) throw new Error(`Unescaped ampersand in: ${text.slice(0, 30)}`)
    } else if (closing) {
      const open = stack.pop()
      if (open !== name) throw new Error(`Closing </${name}> but <${open ?? 'nothing'}> was open`)
    } else {
      if (stack.length === 0 && root) throw new Error('More than one root element')
      if (stack.length === 0) root = name
      if (!selfClosing) stack.push(name)
    }
  }
  if (consumed !== body.length) throw new Error(`Could not read from: ${body.slice(consumed, consumed + 40)}`)
  if (stack.length > 0) throw new Error(`Unclosed <${stack.at(-1)}>`)
  return root
}
