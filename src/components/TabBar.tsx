import { Navigation, Route as RouteIcon } from 'lucide-react'
import type { Destination, Route } from '../hooks/useRoute'

interface Props {
  route: Route
  onGo: (to: Destination) => void
}

/** The phone navigation: fixed to the bottom of the screen, hidden from tablet width up where the header holds the links. */
export function TabBar({ route, onGo }: Props) {
  const items = [
    { to: 'record' as const, label: 'Record', Icon: Navigation, active: route.name === 'record' },
    { to: 'trips' as const, label: 'Trips', Icon: RouteIcon, active: route.name === 'trips' || route.name === 'trip' },
  ]
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[1100] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-950">
      <ul className="mx-auto grid max-w-md grid-cols-2">
        {items.map(({ to, label, Icon, active }) => (
          <li key={to}>
            <button
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onGo(to)}
              className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium ${active ? 'text-teal-800 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
