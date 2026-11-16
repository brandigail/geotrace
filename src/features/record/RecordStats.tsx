import { cardClass, mutedText } from '../../components/ui'
import { averageSpeedKmh, formatDistance, formatDuration, formatSpeed } from '../../lib/format'
import type { Fix } from '../../types'

interface Props {
  distanceM: number
  durationSec: number
  fix: Fix | null
}

export function RecordStats({ distanceM, durationSec, fix }: Props) {
  const tiles = [
    { label: 'Distance', value: formatDistance(distanceM), id: 'stat-distance' },
    { label: 'Time', value: formatDuration(durationSec), id: 'stat-time' },
    { label: 'Average speed', value: formatSpeed(averageSpeedKmh(distanceM, durationSec)), id: 'stat-speed' },
    { label: 'GPS accuracy', value: fix ? `±${Math.round(fix.accuracyM)} m` : '–', id: 'stat-accuracy' },
  ]
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className={`${cardClass} p-3`}>
          <dt className={`text-xs ${mutedText}`}>{t.label}</dt>
          <dd className="text-xl font-bold tabular-nums" data-testid={t.id}>
            {t.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
