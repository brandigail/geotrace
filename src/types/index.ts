export interface LatLng {
  lat: number
  lng: number
}

export interface Trip {
  id: string
  name: string
  startedAt: string
  /** Null while the trip is still being recorded (or was interrupted and not yet finished). */
  endedAt: string | null
  distanceM: number
  /** Time actually spent recording, in seconds. Paused time is not counted. */
  durationSec: number
}

export interface TrackPoint {
  tripId: string
  /** Milliseconds since 1970. */
  ts: number
  lat: number
  lng: number
  altM: number | null
  accuracyM: number
  /** Increases each time the trip is paused and resumed, so the gap between segments is never drawn or measured as travel. */
  seg: number
}

export interface Waypoint {
  id: string
  tripId: string
  lat: number
  lng: number
  note: string
  photo: Blob | null
  createdAt: string
}

/** A GPS reading as the browser reports it, before it has been checked. */
export interface Fix extends LatLng {
  ts: number
  altM: number | null
  accuracyM: number
}
