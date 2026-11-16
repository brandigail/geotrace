import { createContext, useContext } from 'react'
import type { TripRecorder } from '../hooks/useTripRecorder'

export const RecorderContext = createContext<TripRecorder | null>(null)

export function useRecorder(): TripRecorder {
  const ctx = useContext(RecorderContext)
  if (!ctx) throw new Error('useRecorder must be used within RecorderProvider')
  return ctx
}
