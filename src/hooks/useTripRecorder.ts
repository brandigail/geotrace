import { useCallback, useEffect, useRef, useState } from 'react'
import { addPoint, createTrip, db, pointsOf, updateTrip } from '../lib/db'
import { haversineM, judgeFix } from '../lib/geo'
import { GPS_MESSAGES, gpsIssueKind, isFatal, type GpsIssueKind } from '../lib/gpsIssues'
import type { Fix, TrackPoint, Trip } from '../types'

export type RecorderStatus = 'idle' | 'starting' | 'recording' | 'paused'
export type WakeLockState = 'off' | 'active' | 'unsupported' | 'refused'

export interface GpsIssue {
  kind: GpsIssueKind
  message: string
}

const WATCH_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 }
const SAVE_FAILED = 'The trip could not be saved on this device. Storage may be full.'

/** Why location cannot be used here at all, or null when it should work. */
function blocker(): GpsIssueKind | null {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported'
  if (!window.isSecureContext) return 'insecure'
  return null
}

function toFix(position: GeolocationPosition): Fix {
  const { latitude, longitude, altitude, accuracy } = position.coords
  return { lat: latitude, lng: longitude, altM: altitude !== null && Number.isFinite(altitude) ? altitude : null, accuracyM: accuracy, ts: position.timestamp }
}

/**
 * Records a trip with the browser's live position. Every reading is checked (poor accuracy, no real movement and
 * impossible jumps are dropped), saved to IndexedDB as it arrives, and added to the live line. Readings are handled
 * strictly one at a time, so two arriving together cannot both be judged against stale state. Pausing starts a new
 * segment so the gap is never counted as travel. The screen is kept awake while recording, because browsers throttle
 * location for pages that are not visible. A trip that was interrupted (the page closed mid-recording) is kept and can be resumed.
 */
export function useTripRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [points, setPoints] = useState<TrackPoint[]>([])
  const [distanceM, setDistanceM] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  const [fix, setFix] = useState<Fix | null>(null)
  const [ignored, setIgnored] = useState(0)
  const [issue, setIssue] = useState<GpsIssue | null>(null)
  const [wakeLock, setWakeLock] = useState<WakeLockState>('off')
  const [notice, setNotice] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const statusRef = useRef<RecorderStatus>('idle')
  const watchId = useRef<number | null>(null)
  const tripRef = useRef<Trip | null>(null)
  const lastKept = useRef<TrackPoint | null>(null)
  const segment = useRef(0)
  const distance = useRef(0)
  const activeMs = useRef(0)
  const stretchStart = useRef<number | null>(null)
  const sentinel = useRef<WakeLockSentinel | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())

  const setBoth = useCallback((next: RecorderStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const currentDurationSec = useCallback(() => (activeMs.current + (stretchStart.current === null ? 0 : performance.now() - stretchStart.current)) / 1000, [])

  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      setWakeLock('unsupported')
      return
    }
    try {
      sentinel.current = await navigator.wakeLock.request('screen')
      sentinel.current.addEventListener('release', () => setWakeLock((s) => (s === 'active' ? 'off' : s)))
      setWakeLock('active')
    } catch {
      setWakeLock('refused')
    }
  }, [])

  const releaseWakeLock = useCallback(() => {
    void sentinel.current?.release().catch(() => undefined)
    sentinel.current = null
    setWakeLock((s) => (s === 'unsupported' || s === 'refused' ? s : 'off'))
  }, [])

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
  }, [])

  /** Saves the running totals so an interruption loses at most the last few seconds. */
  const saveProgress = useCallback(async () => {
    const current = tripRef.current
    if (!current) return
    try {
      await updateTrip(db, current.id, { distanceM: Math.round(distance.current), durationSec: Math.round(currentDurationSec()) })
    } catch {
      setSaveError(SAVE_FAILED)
    }
  }, [currentDurationSec])

  /** Judges one reading and, if it is good, adds it to the trip. Always called through the queue. */
  const handleReading = useCallback(
    async (reading: Fix) => {
      if (statusRef.current !== 'recording' && statusRef.current !== 'starting') return
      const verdict = judgeFix(lastKept.current, reading)
      if (!verdict.accept) {
        if (verdict.reason === 'inaccurate' || verdict.reason === 'jump') setIgnored((n) => n + 1)
        return
      }
      try {
        // The trip is created on the first good reading, so asking for permission and being refused leaves nothing behind.
        if (!tripRef.current) {
          const created = await createTrip(db, '')
          tripRef.current = created
          setTrip(created)
        }
        const point: TrackPoint = { tripId: tripRef.current.id, ts: reading.ts, lat: reading.lat, lng: reading.lng, altM: reading.altM, accuracyM: reading.accuracyM, seg: segment.current }
        if (lastKept.current) distance.current += haversineM(lastKept.current, point)
        lastKept.current = point
        if (statusRef.current === 'starting') setBoth('recording')
        setPoints((list) => [...list, point])
        setDistanceM(distance.current)
        await addPoint(db, point)
        await saveProgress()
      } catch {
        setSaveError(SAVE_FAILED)
      }
    },
    [saveProgress, setBoth],
  )

  const onPosition = useCallback(
    (position: GeolocationPosition) => {
      const reading = toFix(position)
      setFix(reading)
      setIssue(null)
      queue.current = queue.current.then(() => handleReading(reading))
    },
    [handleReading],
  )

  const onError = useCallback(
    (error: GeolocationPositionError) => {
      const kind = gpsIssueKind(error.code)
      setIssue({ kind, message: GPS_MESSAGES[kind] })
      if (!isFatal(kind)) return
      stopWatching()
      releaseWakeLock()
      if (tripRef.current) {
        activeMs.current = currentDurationSec() * 1000
        stretchStart.current = null
        void saveProgress()
        setBoth('paused')
      } else setBoth('idle')
    },
    [currentDurationSec, releaseWakeLock, saveProgress, setBoth, stopWatching],
  )

  const beginWatching = useCallback(async () => {
    const problem = blocker()
    if (problem) {
      setIssue({ kind: problem, message: GPS_MESSAGES[problem] })
      setBoth(tripRef.current ? 'paused' : 'idle')
      return
    }
    setIssue(null)
    setNotice(null)
    watchId.current = navigator.geolocation.watchPosition(onPosition, onError, WATCH_OPTIONS)
    await acquireWakeLock()
  }, [acquireWakeLock, onError, onPosition, setBoth])

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle') return
    tripRef.current = null
    lastKept.current = null
    segment.current = 0
    distance.current = 0
    activeMs.current = 0
    stretchStart.current = performance.now()
    setTrip(null)
    setPoints([])
    setDistanceM(0)
    setDurationSec(0)
    setIgnored(0)
    setFix(null)
    setSaveError(null)
    setBoth('starting')
    await beginWatching()
  }, [beginWatching, setBoth])

  const pause = useCallback(() => {
    if (statusRef.current !== 'recording' && statusRef.current !== 'starting') return
    stopWatching()
    releaseWakeLock()
    activeMs.current = currentDurationSec() * 1000
    stretchStart.current = null
    lastKept.current = null
    segment.current += 1
    setDurationSec(activeMs.current / 1000)
    void saveProgress()
    setBoth('paused')
  }, [currentDurationSec, releaseWakeLock, saveProgress, setBoth, stopWatching])

  const resume = useCallback(async () => {
    if (statusRef.current !== 'paused') return
    stretchStart.current = performance.now()
    setBoth('recording')
    await beginWatching()
  }, [beginWatching, setBoth])

  /** Ends the trip and returns it (or null when nothing was recorded). */
  const stop = useCallback(async (): Promise<Trip | null> => {
    if (statusRef.current === 'idle') return null
    stopWatching()
    releaseWakeLock()
    const total = currentDurationSec()
    activeMs.current = total * 1000
    stretchStart.current = null
    await queue.current // let any reading still being saved finish first
    const current = tripRef.current
    let finished: Trip | null = null
    if (current) {
      try {
        await updateTrip(db, current.id, { endedAt: new Date().toISOString(), distanceM: Math.round(distance.current), durationSec: Math.round(total) })
        finished = (await db.trips.get(current.id)) ?? null
      } catch {
        setSaveError(SAVE_FAILED)
      }
    } else setNotice('No GPS position was received, so there is no trip to save.')
    tripRef.current = null
    lastKept.current = null
    setBoth('idle')
    setTrip(null)
    setPoints([])
    setFix(null)
    return finished
  }, [currentDurationSec, releaseWakeLock, setBoth, stopWatching])

  /** Continues a trip that was interrupted: its saved points and totals are loaded, and a new segment begins. */
  const resumeInterrupted = useCallback(
    async (interrupted: Trip) => {
      if (statusRef.current !== 'idle') return
      const saved = await pointsOf(db, interrupted.id)
      tripRef.current = interrupted
      lastKept.current = null
      segment.current = (saved.at(-1)?.seg ?? -1) + 1
      distance.current = interrupted.distanceM
      activeMs.current = interrupted.durationSec * 1000
      stretchStart.current = performance.now()
      setTrip(interrupted)
      setPoints(saved)
      setDistanceM(interrupted.distanceM)
      setDurationSec(interrupted.durationSec)
      setIgnored(0)
      setSaveError(null)
      setBoth('recording')
      await beginWatching()
    },
    [beginWatching, setBoth],
  )

  /** Closes an interrupted trip as it stands, ending it at its last recorded point. */
  const finishInterrupted = useCallback(async (interrupted: Trip) => {
    const saved = await pointsOf(db, interrupted.id)
    const last = saved.at(-1)
    await updateTrip(db, interrupted.id, { endedAt: new Date(last?.ts ?? Date.parse(interrupted.startedAt)).toISOString() })
  }, [])

  // The timer on screen.
  useEffect(() => {
    if (status !== 'recording' && status !== 'starting') return
    const timer = window.setInterval(() => setDurationSec(currentDurationSec()), 1000)
    return () => window.clearInterval(timer)
  }, [status, currentDurationSec])

  // Browsers release the screen lock when the page is hidden; take it again when the page comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (statusRef.current === 'recording' || statusRef.current === 'starting')) void acquireWakeLock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [acquireWakeLock])

  // Leaving the page stops listening and lets the screen sleep. The trip stays in the database, ready to be resumed.
  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      void sentinel.current?.release().catch(() => undefined)
    },
    [],
  )

  const problem = blocker()
  return {
    status, trip, points, distanceM, durationSec, fix, ignored, issue, wakeLock, notice, saveError,
    start, pause, resume, stop, resumeInterrupted, finishInterrupted,
    supported: problem === null,
    /** Why location cannot be used here at all, shown before anyone presses anything. */
    unsupportedMessage: problem ? GPS_MESSAGES[problem] : null,
  }
}

export type TripRecorder = ReturnType<typeof useTripRecorder>
