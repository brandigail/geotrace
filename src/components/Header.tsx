import { Moon, Sun } from 'lucide-react'
import type { Destination, Route } from '../hooks/useRoute'
import { formatDuration } from '../lib/format'
import { useRecorder } from '../providers/recorder'
import { useTheme } from '../providers/theme'
import { iconButton } from './ui'

interface Props {
  route: Route
  onGo: (to: Destination) => void
}

const LINKS: readonly { to: 'record' | 'trips'; label: string }[] = [
  { to: 'record', label: 'Record' },
  { to: 'trips', label: 'Trips' },
]

export function Header({ route, onGo }: Props) {
  const { theme, toggleTheme } = useTheme()
  const { status, durationSec } = useRecorder()
  const active = route.name === 'trip' ? 'trips' : route.name
  const recording = status !== 'idle'

  return (
    <header className="sticky top-0 z-[1100] border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <button type="button" className="flex min-h-11 items-center gap-2 text-lg font-bold" onClick={() => onGo('record')} aria-label="GeoTrace, go to Record">
          <img src="/favicon.svg" alt="" width={28} height={28} className="size-7" />
          <span>GeoTrace</span>
        </button>
        <nav aria-label="Main" className="ml-4 hidden flex-1 gap-1 md:flex">
          {LINKS.map((l) => (
            <button
              key={l.to}
              type="button"
              aria-current={active === l.to ? 'page' : undefined}
              onClick={() => onGo(l.to)}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
                active === l.to ? 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {l.label}
            </button>
          ))}
        </nav>
        {recording && (
          <button type="button" onClick={() => onGo('record')} className="ml-auto flex min-h-11 items-center gap-2 rounded-full bg-red-50 px-3 text-sm font-semibold text-red-800 md:ml-0 dark:bg-red-950 dark:text-red-200" data-testid="recording-pill">
            <span aria-hidden className={`size-2.5 rounded-full bg-red-600 ${status === 'recording' ? 'animate-pulse' : ''}`} />
            <span>{status === 'paused' ? 'Paused' : 'Recording'}</span>
            <span className="font-mono tabular-nums">{formatDuration(durationSec)}</span>
          </button>
        )}
        <button type="button" className={`${iconButton} ${recording ? '' : 'ml-auto md:ml-auto'}`} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </button>
      </div>
    </header>
  )
}
