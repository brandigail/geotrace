import type { ReactNode } from 'react'
import { useTripRecorder } from '../hooks/useTripRecorder'
import { RecorderContext } from './recorder'

/** Keeps the recording going while the user looks at trip history, because it lives above the screens. */
export function RecorderProvider({ children }: { children: ReactNode }) {
  const recorder = useTripRecorder()
  return <RecorderContext.Provider value={recorder}>{children}</RecorderContext.Provider>
}
