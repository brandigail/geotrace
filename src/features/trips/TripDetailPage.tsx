import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Crosshair, Download, Trash2 } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { cardClass, dangerButton, inputClass, mutedText, secondaryButton } from '../../components/ui'
import { addWaypoint, db, deleteWaypoint, pointsOf, updateWaypoint } from '../../lib/db'
import { downloadBlob } from '../../lib/download'
import { elevationProfile, elevationStats } from '../../lib/elevation'
import { fileStem, formatWhen } from '../../lib/format'
import { segmentsOf } from '../../lib/geo'
import { toGpx, waypointName } from '../../lib/gpx'
import { toKml } from '../../lib/kml'
import { useRecorder } from '../../providers/recorder'
import { useTripData } from '../../providers/data'
import type { LatLng, Trip, Waypoint } from '../../types'
import TripMap from '../map/TripMap'
import { WaypointDialog, type WaypointDraft } from '../waypoints/WaypointDialog'
import { WaypointList } from '../waypoints/WaypointList'
import { TripStats } from './TripStats'

// The charting library is the biggest part of the app, so it only loads when a trip with altitude data is opened.
const ElevationChart = lazy(() => import('./ElevationChart'))

type Editing = { kind: 'new'; place: LatLng } | { kind: 'edit'; waypoint: Waypoint }

function Title({ trip }: { trip: Trip }) {
  const { renameTrip } = useTripData()
  const [name, setName] = useState(trip.name)
  return (
    <div>
      <label htmlFor="trip-name" className="sr-only">
        Trip name
      </label>
      <input
        id="trip-name"
        className={`${inputClass} mt-0 text-xl font-bold`}
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => (name.trim() ? void renameTrip(trip.id, name) : setName(trip.name))}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </div>
  )
}

interface Props {
  id: string
  onBack: () => void
}

export function TripDetailPage({ id, onBack }: Props) {
  const { removeTrip } = useTripData()
  const recorder = useRecorder()
  const found = useLiveQuery(() => db.trips.where('id').equals(id).toArray(), [id])
  const points = useLiveQuery(() => pointsOf(db, id), [id])
  const waypoints = useLiveQuery(async () => (await db.waypoints.where('tripId').equals(id).toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [id])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const trip = found?.[0]
  const segments = useMemo(() => segmentsOf(points ?? []), [points])
  const profile = useMemo(() => elevationProfile(points ?? []), [points])
  const elevation = useMemo(() => elevationStats(profile), [profile])
  const mapWaypoints = useMemo(() => (waypoints ?? []).map((w, i) => ({ id: w.id, lat: w.lat, lng: w.lng, label: waypointName(w.note, i) })), [waypoints])

  if (found === undefined) return <p className={mutedText}>Loading the trip…</p>
  if (!trip) {
    return (
      <section className={`${cardClass} space-y-3 p-6 text-center`}>
        <h1 className="text-xl font-bold">Trip not found</h1>
        <p className={mutedText}>It may have been deleted.</p>
        <a href="#/trips" className={secondaryButton}>
          Back to your trips
        </a>
      </section>
    )
  }

  const isBeingRecorded = recorder.trip?.id === trip.id

  async function save(draft: WaypointDraft) {
    if (!editing || !trip) return
    if (editing.kind === 'new') await addWaypoint(db, { tripId: trip.id, lat: editing.place.lat, lng: editing.place.lng, note: draft.note, photo: draft.photo })
    else await updateWaypoint(db, editing.waypoint.id, { note: draft.note, photo: draft.photo })
    setEditing(null)
  }

  function exportAs(kind: 'gpx' | 'kml') {
    if (!trip) return
    const text = kind === 'gpx' ? toGpx(trip, points ?? [], waypoints ?? []) : toKml(trip, points ?? [], waypoints ?? [])
    downloadBlob(`${fileStem(trip.name)}.${kind}`, new Blob([text], { type: kind === 'gpx' ? 'application/gpx+xml' : 'application/vnd.google-earth.kml+xml' }))
  }

  return (
    <div className="space-y-4">
      <button type="button" className={secondaryButton} onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden /> All trips
      </button>
      <Title key={`title-${trip.id}`} trip={trip} />
      <p className={`text-sm ${mutedText}`}>
        {formatWhen(trip.startedAt)}
        {trip.endedAt === null && (isBeingRecorded ? ' · still recording' : ' · not finished')}
      </p>

      <div className="relative h-[46dvh] min-h-64 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800" data-testid="map-frame">
        <TripMap
          segments={segments}
          waypoints={mapWaypoints}
          fitKey={trip.id}
          selectedWaypointId={selected}
          onSelectWaypoint={setSelected}
          onPick={adding ? (place) => { setEditing({ kind: 'new', place }); setAdding(false) } : undefined}
        />
        {adding && (
          <p role="status" className="absolute inset-x-3 bottom-3 z-[1000] rounded-lg bg-slate-900/85 px-3 py-2 text-center text-sm text-white">
            Tap the map where the waypoint belongs.
          </p>
        )}
      </div>

      <TripStats trip={trip} elevation={elevation} />

      <section className={`${cardClass} space-y-2 p-4`} aria-labelledby="elevation-heading">
        <h2 id="elevation-heading" className="text-lg font-semibold">
          Elevation
        </h2>
        {profile.length >= 2 ? (
          <Suspense fallback={<p className={`text-sm ${mutedText}`}>Loading the chart…</p>}>
            <ElevationChart samples={profile} stats={elevation} />
          </Suspense>
        ) : (
          <p className={`text-sm ${mutedText}`} data-testid="no-elevation">
            This trip has no altitude data. Some phones and browsers do not report altitude, so the profile is only drawn when they do.
          </p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="waypoints-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="waypoints-heading" className="text-lg font-semibold">
            Waypoints
          </h2>
          <button type="button" className={secondaryButton} aria-pressed={adding} onClick={() => setAdding((a) => !a)} data-testid="add-waypoint">
            <Crosshair className="size-4" aria-hidden /> {adding ? 'Cancel' : 'Add a waypoint'}
          </button>
        </div>
        <WaypointList
          waypoints={waypoints ?? []}
          selectedId={selected}
          onShow={(wid) => {
            setSelected(wid)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onEdit={(waypoint) => setEditing({ kind: 'edit', waypoint })}
          onDelete={(wid) => void deleteWaypoint(db, wid)}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} onClick={() => exportAs('gpx')} data-testid="export-gpx">
          <Download className="size-4" aria-hidden /> Export GPX
        </button>
        <button type="button" className={secondaryButton} onClick={() => exportAs('kml')} data-testid="export-kml">
          <Download className="size-4" aria-hidden /> Export KML
        </button>
        {confirming ? (
          <button
            type="button"
            className={dangerButton}
            onClick={() => {
              void removeTrip(trip.id)
              onBack()
            }}
            onBlur={() => setConfirming(false)}
            autoFocus
          >
            Confirm delete
          </button>
        ) : (
          <button type="button" className={secondaryButton} onClick={() => setConfirming(true)} disabled={isBeingRecorded}>
            <Trash2 className="size-4" aria-hidden /> Delete trip
          </button>
        )}
      </div>

      <WaypointDialog
        draft={editing ? (editing.kind === 'edit' ? { note: editing.waypoint.note, photo: editing.waypoint.photo } : { note: '', photo: null }) : null}
        title={editing?.kind === 'edit' ? 'Edit waypoint' : 'Add a waypoint'}
        where={editing?.kind === 'new' ? `${editing.place.lat.toFixed(5)}, ${editing.place.lng.toFixed(5)}` : undefined}
        onSave={(d) => void save(d)}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
