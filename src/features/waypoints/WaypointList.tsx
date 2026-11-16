import { MapPinned, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cardClass, dangerButton, iconButton, mutedText } from '../../components/ui'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { formatWhen } from '../../lib/format'
import { waypointName } from '../../lib/gpx'
import type { Waypoint } from '../../types'

interface ItemProps {
  waypoint: Waypoint
  index: number
  selected: boolean
  onShow: () => void
  onEdit: () => void
  onDelete: () => void
}

function Item({ waypoint, index, selected, onShow, onEdit, onDelete }: ItemProps) {
  const url = useObjectUrl(waypoint.photo)
  const [confirming, setConfirming] = useState(false)
  const name = waypointName(waypoint.note, index)

  return (
    <li className={`${cardClass} flex gap-3 p-3 ${selected ? 'ring-2 ring-teal-600' : ''}`} data-testid="waypoint-item">
      {url && <img src={url} alt={`Photo for ${name}`} className="size-20 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{name}</p>
        {waypoint.note.trim() && waypoint.note.trim() !== name && <p className="mt-0.5 text-sm whitespace-pre-wrap">{waypoint.note}</p>}
        <p className={`mt-1 text-xs ${mutedText}`}>
          {formatWhen(waypoint.createdAt)} · {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
        {confirming ? (
          <button type="button" className={dangerButton} onClick={onDelete} onBlur={() => setConfirming(false)} autoFocus>
            Confirm delete
          </button>
        ) : (
          <>
            <button type="button" className={iconButton} onClick={onShow} aria-label={`Show ${name} on the map`}>
              <MapPinned className="size-5" aria-hidden />
            </button>
            <button type="button" className={iconButton} onClick={onEdit} aria-label={`Edit ${name}`}>
              <Pencil className="size-5" aria-hidden />
            </button>
            <button type="button" className={iconButton} onClick={() => setConfirming(true)} aria-label={`Delete ${name}`}>
              <Trash2 className="size-5" aria-hidden />
            </button>
          </>
        )}
      </div>
    </li>
  )
}

interface Props {
  waypoints: readonly Waypoint[]
  selectedId: string | null
  onShow: (id: string) => void
  onEdit: (waypoint: Waypoint) => void
  onDelete: (id: string) => void
}

export function WaypointList({ waypoints, selectedId, onShow, onEdit, onDelete }: Props) {
  if (waypoints.length === 0) return <p className={`text-sm ${mutedText}`}>No waypoints yet. Use "Add a waypoint", then tap the map where it belongs.</p>
  return (
    <ul className="space-y-2" aria-label="Waypoints">
      {waypoints.map((w, i) => (
        <Item key={w.id} waypoint={w} index={i} selected={w.id === selectedId} onShow={() => onShow(w.id)} onEdit={() => onEdit(w)} onDelete={() => onDelete(w.id)} />
      ))}
    </ul>
  )
}
