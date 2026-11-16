import { useCallback, useMemo, useSyncExternalStore } from 'react'

export type Route = { name: 'record' } | { name: 'trips' } | { name: 'trip'; id: string }

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const read = () => window.location.hash

export function parseRoute(hash: string): Route {
  const trip = /^#\/trip\/([A-Za-z0-9-]{1,64})$/.exec(hash)
  if (trip?.[1]) return { name: 'trip', id: trip[1] }
  return hash === '#/trips' ? { name: 'trips' } : { name: 'record' }
}

export type Destination = 'record' | 'trips' | { trip: string }

/** The current screen, kept in the URL hash so the back button, a refresh and a shared link all behave. */
export function useRoute(): [Route, (to: Destination) => void] {
  const hash = useSyncExternalStore(subscribe, read, () => '')
  const route = useMemo(() => parseRoute(hash), [hash])
  const go = useCallback((to: Destination) => {
    window.location.hash = to === 'record' ? '/' : to === 'trips' ? '/trips' : `/trip/${to.trip}`
    window.scrollTo({ top: 0 })
  }, [])
  return [route, go]
}
