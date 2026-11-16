import { createContext, useContext } from 'react'
import type { Trip } from '../types'

export interface TripData {
  /** False until the saved trips have been read from this device. */
  ready: boolean
  /** True while the demo trips are being added on the very first launch, so an empty list is not mistaken for "no trips". */
  seeding: boolean
  /** Finished trips, newest first. */
  trips: Trip[]
  /** Trips that were never finished (the page closed while recording), newest first. */
  interrupted: Trip[]
  saveError: string | null
  renameTrip: (id: string, name: string) => Promise<void>
  removeTrip: (id: string) => Promise<void>
  loadDemo: () => Promise<void>
  clearAll: () => Promise<void>
}

export const TripDataContext = createContext<TripData | null>(null)

export function useTripData(): TripData {
  const ctx = useContext(TripDataContext)
  if (!ctx) throw new Error('useTripData must be used within TripDataProvider')
  return ctx
}
