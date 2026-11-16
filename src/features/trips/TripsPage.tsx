import { Clock, Route as RouteIcon } from 'lucide-react'
import { useState } from 'react'
import { cardClass, dangerButton, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { averageSpeedKmh, formatDistance, formatDuration, formatSpeed, formatWhen } from '../../lib/format'
import { useTripData } from '../../providers/data'
import type { Destination } from '../../hooks/useRoute'

interface Props {
  onGo: (to: Destination) => void
}

export function TripsPage({ onGo }: Props) {
  const { trips, seeding, loadDemo, clearAll } = useTripData()
  const [pending, setPending] = useState<'demo' | 'clear' | null>(null)

  async function confirm() {
    if (pending === 'demo') await loadDemo()
    else await clearAll()
    setPending(null)
  }

  return (
    <section className="space-y-4" aria-labelledby="trips-heading">
      <h1 id="trips-heading" className="text-2xl font-bold">
        Your trips
      </h1>

      {trips.length === 0 && seeding ? (
        <p className={mutedText}>Adding the demo trips…</p>
      ) : trips.length === 0 ? (
        <div className={`${cardClass} space-y-3 p-6 text-center`}>
          <p className="font-semibold">No trips yet</p>
          <p className={mutedText}>Record a trip and it will be saved here with its map, stats and waypoints.</p>
          <button type="button" className={primaryButton} onClick={() => onGo('record')}>
            Record a trip
          </button>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Trips">
          {trips.map((trip) => (
            <li key={trip.id}>
              <a
                href={`#/trip/${trip.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
              >
                <span className="block font-semibold">{trip.name}</span>
                <span className={`mt-0.5 block text-xs ${mutedText}`}>{formatWhen(trip.startedAt)}</span>
                <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <RouteIcon className="size-4 text-teal-700 dark:text-teal-400" aria-hidden /> {formatDistance(trip.distanceM)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4 text-teal-700 dark:text-teal-400" aria-hidden /> {formatDuration(trip.durationSec)}
                  </span>
                  <span className={mutedText}>{formatSpeed(averageSpeedKmh(trip.distanceM, trip.durationSec))}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className={`text-sm ${mutedText}`}>Trips and photos are stored only in this browser, on this device. Export a trip as GPX or KML to keep a copy.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => setPending('demo')}>
            Load demo trips
          </button>
          <button type="button" className={secondaryButton} onClick={() => setPending('clear')}>
            Delete all trips
          </button>
        </div>
        {pending && (
          <div role="alertdialog" aria-label="Confirm" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-sm">{pending === 'demo' ? 'This replaces your trips with three demo trips. Export first if you want to keep yours.' : 'This deletes every trip, point, waypoint and photo on this device. This cannot be undone.'}</p>
            <div className="flex gap-2">
              <button type="button" className={pending === 'clear' ? dangerButton : primaryButton} onClick={() => void confirm()} autoFocus>
                {pending === 'demo' ? 'Load demo trips' : 'Delete everything'}
              </button>
              <button type="button" className={secondaryButton} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
