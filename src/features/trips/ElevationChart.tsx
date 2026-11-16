import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ElevationSample, ElevationStats } from '../../lib/elevation'
import { formatElevation } from '../../lib/format'

interface Props {
  samples: readonly ElevationSample[]
  stats: ElevationStats | null
}

/** Altitude along the trip. Loaded on demand, because the charting library is the largest part of the app. */
export default function ElevationChart({ samples, stats }: Props) {
  const data = samples.map((s) => ({ km: s.distanceM / 1000, alt: Math.round(s.altM * 10) / 10 }))
  const summary = stats ? `Elevation from ${formatElevation(stats.minM)} to ${formatElevation(stats.maxM)}, climbing ${formatElevation(stats.gainM)} in total.` : 'Elevation profile'

  return (
    <figure aria-label={summary} className="m-0">
      <div className="h-52 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="elevation-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.35} />
            <XAxis dataKey="km" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v: number) => v.toFixed(1)} tick={{ fontSize: 12 }} unit=" km" />
            <YAxis domain={['dataMin - 10', 'dataMax + 10']} tickFormatter={(v: number) => String(Math.round(v))} tick={{ fontSize: 12 }} width={52} unit=" m" />
            <Tooltip formatter={(value) => [`${Math.round(Number(value))} m`, 'Elevation']} labelFormatter={(label) => `${Number(label).toFixed(2)} km`} />
            <Area type="monotone" dataKey="alt" stroke="#0f766e" strokeWidth={2} fill="url(#elevation-fill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
