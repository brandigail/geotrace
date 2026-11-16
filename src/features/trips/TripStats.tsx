import { cardClass, mutedText } from '../../components/ui'
import type { ElevationStats } from '../../lib/elevation'
import { averageSpeedKmh, formatDistance, formatDuration, formatElevation, formatPace, formatSpeed } from '../../lib/format'
import type { Trip } from '../../types'

interface Props {
  trip: Trip
  elevation: ElevationStats | null
}

export function TripStats({ trip, elevation }: Props) {
  const speed = averageSpeedKmh(trip.distanceM, trip.durationSec)
  const tiles = [
    { label: 'Distance', value: formatDistance(trip.distanceM) },
    { label: 'Time', value: formatDuration(trip.durationSec) },
    { label: 'Average speed', value: formatSpeed(speed) },
    { label: 'Average pace', value: formatPace(speed) },
    ...(elevation
      ? [
          { label: 'Climbed', value: formatElevation(elevation.gainM) },
          { label: 'Descended', value: formatElevation(elevation.lossM) },
          { label: 'Highest point', value: formatElevation(elevation.maxM) },
          { label: 'Lowest point', value: formatElevation(elevation.minM) },
        ]
      : []),
  ]
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="trip-stats">
      {tiles.map((t) => (
        <div key={t.label} className={`${cardClass} p-3`}>
          <dt className={`text-xs ${mutedText}`}>{t.label}</dt>
          <dd className="text-lg font-bold tabular-nums">{t.value}</dd>
        </div>
      ))}
    </dl>
  )
}
