import { useLiveQuery } from 'dexie-react-hooks'
import { LocateFixed, MapPin, Pause, Play, Square, Crosshair } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cardClass, errorText, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { addWaypoint, db } from '../../lib/db'
import { segmentsOf } from '../../lib/geo'
import { GPS_MESSAGES } from '../../lib/gpsIssues'
import { waypointName } from '../../lib/gpx'
import { useRecorder } from '../../providers/recorder'
import { useTripData } from '../../providers/data'
import type { LatLng } from '../../types'
import TripMap, { type CurrentPosition } from '../map/TripMap'
import { WaypointDialog, type WaypointDraft } from '../waypoints/WaypointDialog'
import { RecordStats } from './RecordStats'

interface Props {
  onFinished: (tripId: string) => void
}

const WAKE_TEXT = {
  active: 'The screen is being kept awake while you record.',
  unsupported: 'This browser cannot keep the screen awake, so keep GeoTrace open on screen while recording.',
  refused: 'The screen could not be kept awake. Keep GeoTrace open on screen while recording.',
  off: '',
} as const

export function RecordPage({ onFinished }: Props) {
  const rec = useRecorder()
  const { interrupted } = useTripData()
  const [follow, setFollow] = useState(true)
  const [picking, setPicking] = useState(false)
  const [place, setPlace] = useState<LatLng | null>(null)
  const [located, setLocated] = useState<CurrentPosition | null>(null)
  const [locateError, setLocateError] = useState<string | null>(null)

  const tripId = rec.trip?.id ?? null
  const waypoints = useLiveQuery(() => (tripId ? db.waypoints.where('tripId').equals(tripId).toArray() : []), [tripId]) ?? []
  const segments = useMemo(() => segmentsOf(rec.points), [rec.points])
  const active = rec.status !== 'idle'
  const current: CurrentPosition | null = rec.fix ? { lat: rec.fix.lat, lng: rec.fix.lng, accuracyM: rec.fix.accuracyM } : located
  const mapWaypoints = waypoints.map((w, i) => ({ id: w.id, lat: w.lat, lng: w.lng, label: waypointName(w.note, i) }))
  const resumable = interrupted[0]

  function locate() {
    if (!navigator.geolocation) {
      setLocateError(GPS_MESSAGES.unsupported)
      return
    }
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocated({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy })
        setFollow(true)
      },
      (e) => setLocateError(e.code === 1 ? GPS_MESSAGES.denied : GPS_MESSAGES.unavailable),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  async function stop() {
    setPicking(false)
    const finished = await rec.stop()
    if (finished) onFinished(finished.id)
  }

  async function saveWaypoint(draft: WaypointDraft) {
    if (!place || !tripId) return
    await addWaypoint(db, { tripId, lat: place.lat, lng: place.lng, note: draft.note, photo: draft.photo })
    setPlace(null)
  }

  const statusText = {
    idle: 'Ready to record',
    starting: 'Waiting for a GPS position…',
    recording: 'Recording',
    paused: 'Paused',
  }[rec.status]

  return (
    <section className="space-y-4" aria-labelledby="record-heading">
      <h1 id="record-heading" className="sr-only">
        Record a trip
      </h1>

      {resumable && !active && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40" data-testid="interrupted-banner">
          <p className="min-w-0 flex-1">
            Your trip <strong>{resumable.name}</strong> was interrupted before it was finished.
          </p>
          <button type="button" className={primaryButton} onClick={() => void rec.resumeInterrupted(resumable)}>
            Resume it
          </button>
          <button type="button" className={secondaryButton} onClick={() => void rec.finishInterrupted(resumable)}>
            Finish it as it is
          </button>
        </div>
      )}

      <div className="relative h-[50dvh] min-h-72 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800" data-testid="map-frame">
        <TripMap
          segments={segments}
          waypoints={mapWaypoints}
          current={current}
          follow={follow}
          onFollowChange={setFollow}
          onPick={picking && tripId ? (p) => { setPlace(p); setPicking(false) } : undefined}
        />
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <button
            type="button"
            onClick={active ? () => setFollow(true) : locate}
            aria-pressed={active ? follow : undefined}
            aria-label={active ? 'Keep the map on my position' : 'Show my position'}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow hover:bg-slate-100"
          >
            <LocateFixed className="size-5" aria-hidden />
          </button>
        </div>
        {picking && (
          <p role="status" className="absolute inset-x-3 bottom-3 z-[1000] rounded-lg bg-slate-900/85 px-3 py-2 text-center text-sm text-white">
            Tap the map where the pin should go.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 font-semibold" role="status" data-testid="record-status">
          <span aria-hidden className={`size-3 rounded-full ${rec.status === 'recording' ? 'animate-pulse bg-red-600' : rec.status === 'paused' ? 'bg-amber-500' : 'bg-slate-400'}`} />
          {statusText}
        </p>
        {rec.ignored > 0 && (
          <p className={`text-sm ${mutedText}`} data-testid="ignored">
            {rec.ignored} weak GPS reading{rec.ignored === 1 ? '' : 's'} ignored
          </p>
        )}
      </div>

      <RecordStats distanceM={rec.distanceM} durationSec={rec.durationSec} fix={rec.fix} />

      <div className="flex flex-wrap gap-2">
        {rec.status === 'idle' && (
          <button type="button" className={primaryButton} onClick={() => void rec.start()} disabled={!rec.supported} data-testid="start-button">
            <Play className="size-4 fill-current" aria-hidden /> Start trip
          </button>
        )}
        {(rec.status === 'recording' || rec.status === 'starting') && (
          <button type="button" className={secondaryButton} onClick={rec.pause} data-testid="pause-button">
            <Pause className="size-4" aria-hidden /> Pause
          </button>
        )}
        {rec.status === 'paused' && (
          <button type="button" className={primaryButton} onClick={() => void rec.resume()} data-testid="resume-button">
            <Play className="size-4 fill-current" aria-hidden /> Resume
          </button>
        )}
        {active && (
          <button type="button" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800" onClick={() => void stop()} data-testid="stop-button">
            <Square className="size-4 fill-current" aria-hidden /> Stop and save
          </button>
        )}
        {active && (
          <>
            <button
              type="button"
              className={secondaryButton}
              disabled={!rec.fix || !tripId}
              onClick={() => rec.fix && setPlace({ lat: rec.fix.lat, lng: rec.fix.lng })}
              data-testid="pin-here"
            >
              <MapPin className="size-4" aria-hidden /> Pin at my location
            </button>
            <button type="button" className={secondaryButton} disabled={!tripId} aria-pressed={picking} onClick={() => setPicking((p) => !p)} data-testid="pin-on-map">
              <Crosshair className="size-4" aria-hidden /> {picking ? 'Cancel pin' : 'Drop pin on map'}
            </button>
          </>
        )}
      </div>

      {(rec.issue?.message ?? rec.unsupportedMessage) && (
        <p role="alert" className={`text-sm ${rec.issue?.kind === 'timeout' ? mutedText : errorText}`} data-testid="gps-issue">
          {rec.issue?.message ?? rec.unsupportedMessage}
        </p>
      )}
      {locateError && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {locateError}
        </p>
      )}
      {rec.notice && <p role="status" className={`text-sm ${mutedText}`}>{rec.notice}</p>}
      {rec.saveError && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {rec.saveError}
        </p>
      )}

      <div className={`${cardClass} space-y-1 p-3 text-sm ${mutedText}`}>
        <p>Tracking works best with the screen on and GeoTrace in front. Phones slow down or stop location updates for pages in the background.</p>
        {active && WAKE_TEXT[rec.wakeLock] && <p data-testid="wake-lock">{WAKE_TEXT[rec.wakeLock]}</p>}
      </div>

      <WaypointDialog
        draft={place ? { note: '', photo: null } : null}
        title="Drop a pin"
        where={place ? `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}` : undefined}
        onSave={(d) => void saveWaypoint(d)}
        onClose={() => setPlace(null)}
      />
    </section>
  )
}
