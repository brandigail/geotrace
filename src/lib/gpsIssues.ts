export type GpsIssueKind = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout'

export const GPS_MESSAGES: Record<GpsIssueKind, string> = {
  unsupported: 'This browser cannot get your location.',
  insecure: 'Location needs a secure (https) connection.',
  denied: "Location access is blocked. Allow it in your browser's site settings, then try again.",
  unavailable: 'Your position is not available right now. Check that location is switched on and try moving to open sky.',
  timeout: 'Waiting for a GPS signal. This can take a minute, and works best outdoors with a clear view of the sky.',
}

/** Turns the browser's GeolocationPositionError code (1 denied, 2 unavailable, 3 timed out) into one of our own reasons. */
export function gpsIssueKind(code: number): GpsIssueKind {
  if (code === 1) return 'denied'
  if (code === 3) return 'timeout'
  return 'unavailable'
}

/** Only a denial stops recording for good; the other problems usually pass once there is signal again. */
export function isFatal(kind: GpsIssueKind): boolean {
  return kind === 'denied' || kind === 'unsupported' || kind === 'insecure'
}
