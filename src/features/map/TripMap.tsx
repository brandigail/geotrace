import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { boundsOf } from '../../lib/geo'
import type { LatLng } from '../../types'
import { pinIcon } from './icons'

export interface MapWaypoint extends LatLng {
  id: string
  label: string
}

export interface CurrentPosition extends LatLng {
  accuracyM: number
}

interface Props {
  /** The track as lines, one per segment. */
  segments: readonly (readonly LatLng[])[]
  waypoints: readonly MapWaypoint[]
  current?: CurrentPosition | null
  /** Keep the map centred on `current`. Dragging the map turns this off. */
  follow?: boolean
  onFollowChange?: (follow: boolean) => void
  /** Whenever this value changes, the map zooms to fit the whole track. */
  fitKey?: string
  /** When given, a tap on the map picks a place instead of just moving it. */
  onPick?: (place: LatLng) => void
  selectedWaypointId?: string | null
  onSelectWaypoint?: (id: string) => void
  className?: string
}

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const TRACK_COLOR = '#0f766e'

/** A map's size can change after it was drawn (rotating a phone, a panel opening), which leaves grey strips unless it is told. */
function ResizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

/**
 * Zooms to the whole track once per `fitKey`, as soon as there is something to show. Remembering the key that was
 * fitted means the line growing while recording never snaps the view back, and points that load after the map is
 * created still get fitted.
 */
function FitToTrack({ segments, waypoints, fitKey }: Pick<Props, 'segments' | 'waypoints' | 'fitKey'>) {
  const map = useMap()
  const fitted = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (fitKey === undefined || fitted.current === fitKey) return
    const bounds = boundsOf([...segments.flat(), ...waypoints])
    if (!bounds) return
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17, animate: false })
    fitted.current = fitKey
  }, [map, fitKey, segments, waypoints])
  return null
}

function FollowPosition({ current, follow, onFollowChange }: Pick<Props, 'current' | 'follow' | 'onFollowChange'>) {
  const map = useMap()
  useMapEvents({ dragstart: () => onFollowChange?.(false) })
  useEffect(() => {
    if (follow && current) map.setView([current.lat, current.lng], Math.max(map.getZoom(), 16), { animate: true })
  }, [map, follow, current])
  return null
}

function PickPlace({ onPick }: Pick<Props, 'onPick'>) {
  const map = useMap()
  useMapEvents({ click: (event) => onPick?.({ lat: event.latlng.lat, lng: event.latlng.lng }) })
  useEffect(() => {
    map.getContainer().style.cursor = onPick ? 'crosshair' : ''
  }, [map, onPick])
  return null
}

/** Moves the map to a waypoint when a different one is chosen, and only then. */
function FlyToSelected({ waypoints, selectedId }: { waypoints: readonly MapWaypoint[]; selectedId: string | null | undefined }) {
  const map = useMap()
  const shown = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (shown.current === selectedId) return
    shown.current = selectedId
    const selected = waypoints.find((w) => w.id === selectedId)
    if (selected) map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 16), { animate: true })
  }, [map, selectedId, waypoints])
  return null
}

export default function TripMap({ segments, waypoints, current, follow, onFollowChange, fitKey, onPick, selectedWaypointId, onSelectWaypoint, className = 'h-full w-full' }: Props) {
  const lines = useMemo(() => segments.map((segment) => segment.map((p) => [p.lat, p.lng] as [number, number])), [segments])
  const first = segments[0]?.[0]
  const lastSegment = segments.at(-1)
  const last = lastSegment?.at(-1)

  return (
    <MapContainer center={[20, 0]} zoom={2} className={className} aria-label="Map of the trip" scrollWheelZoom worldCopyJump>
      <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={19} />
      <ResizeWatcher />
      <FitToTrack segments={segments} waypoints={waypoints} fitKey={fitKey} />
      <FollowPosition current={current} follow={follow} onFollowChange={onFollowChange} />
      <PickPlace onPick={onPick} />
      <FlyToSelected waypoints={waypoints} selectedId={selectedWaypointId} />

      {lines.map((positions, i) => (
        <Polyline key={i} positions={positions} pathOptions={{ color: TRACK_COLOR, weight: 5, opacity: 0.9 }} />
      ))}
      {first && <CircleMarker center={[first.lat, first.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#16a34a', fillOpacity: 1 }} />}
      {last && last !== first && <CircleMarker center={[last.lat, last.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#dc2626', fillOpacity: 1 }} />}
      {waypoints.map((w) => (
        <Marker key={w.id} position={[w.lat, w.lng]} icon={pinIcon(w.id === selectedWaypointId ? '#c2410c' : '#ea580c', w.id === selectedWaypointId)} title={w.label} alt={w.label} eventHandlers={{ click: () => onSelectWaypoint?.(w.id) }} />
      ))}
      {current && (
        <>
          <Circle center={[current.lat, current.lng]} radius={current.accuracyM} pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.12 }} />
          <CircleMarker center={[current.lat, current.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />
        </>
      )}
    </MapContainer>
  )
}
