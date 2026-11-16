import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db, deleteTrip, replaceAll, seedIfEmpty, updateTrip } from '../lib/db'
import { drawPlaceholderPhoto } from '../lib/photo'
import { buildSeed } from '../lib/seed'
import { useRecorder } from './recorder'
import { TripDataContext, type TripData } from './data'
import type { Trip } from '../types'

const SEEDED_KEY = 'geotrace-seeded'
const NO_TRIPS: Trip[] = []

// A flag records that the demo trips were added once, so deleting them all later does not bring them back.
function wasSeeded(): boolean {
  try {
    return localStorage.getItem(SEEDED_KEY) === '1'
  } catch {
    return false
  }
}

function markSeeded(): void {
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // ignore: worst case the demo trips are offered again on an empty database
  }
}

function hueOf(text: string): number {
  let hash = 0
  for (const char of text) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 360
  return hash
}

async function demo() {
  return buildSeed(new Date(), (label) => drawPlaceholderPhoto(label, hueOf(label)))
}

const SETTLE_MS = 2500

/**
 * Resolves once the page has fully loaded, a short grace period has passed and the browser is idle. Building the demo
 * trips (a few hundred points and some drawn photos) must never compete with the app's own first load.
 */
async function whenIdle(): Promise<void> {
  if (document.readyState !== 'complete') await new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }))
  await new Promise<void>((resolve) => window.setTimeout(resolve, SETTLE_MS))
  const requestIdle: ((callback: () => void, options?: { timeout: number }) => number) | undefined = window.requestIdleCallback?.bind(window)
  if (requestIdle) await new Promise<void>((resolve) => requestIdle(() => resolve(), { timeout: 2000 }))
}

/** Reads trips live from IndexedDB, adds the demo trips on the very first launch and writes every change back. */
export function TripDataProvider({ children }: { children: ReactNode }) {
  const recorder = useRecorder()
  const [initialised, setInitialised] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const needsDemo = (await db.trips.count()) === 0 && !wasSeeded()
        // The app is usable straight away; the demo trips arrive in the background once the page has settled.
        if (needsDemo && !cancelled) setSeeding(true)
        if (!cancelled) setInitialised(true)
        if (needsDemo) {
          await whenIdle()
          const seed = await demo()
          // Adds only if still empty: the user may have started a trip while the demo was being built.
          await seedIfEmpty(db, seed.trips, seed.points, seed.waypoints)
          markSeeded()
        }
      } catch {
        setSaveError('Your browser is blocking storage, so trips cannot be saved on this device.')
        if (!cancelled) setInitialised(true)
      } finally {
        if (!cancelled) setSeeding(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const all = useLiveQuery(() => db.trips.toArray(), [])

  const guard = useCallback(async (work: () => Promise<void>) => {
    try {
      await work()
      setSaveError(null)
    } catch {
      setSaveError('Your last change could not be saved on this device.')
    }
  }, [])

  const recordingId = recorder.trip?.id ?? null
  const value = useMemo<TripData>(() => {
    const sorted = [...(all ?? NO_TRIPS)].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    return {
      ready: initialised && all !== undefined,
      seeding,
      trips: sorted.filter((t) => t.endedAt !== null),
      // The trip being recorded right now is not "interrupted", even though it is not finished yet.
      interrupted: sorted.filter((t) => t.endedAt === null && t.id !== recordingId),
      saveError,
      renameTrip: (id, name) => guard(() => updateTrip(db, id, { name })),
      removeTrip: (id) => guard(() => deleteTrip(db, id)),
      loadDemo: () =>
        guard(async () => {
          const seed = await demo()
          await replaceAll(db, seed.trips, seed.points, seed.waypoints)
        }),
      clearAll: () => guard(() => replaceAll(db, [], [], [])),
    }
  }, [all, initialised, seeding, recordingId, saveError, guard])

  return <TripDataContext.Provider value={value}>{children}</TripDataContext.Provider>
}
