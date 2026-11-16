import { Header } from './components/Header'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { mutedText } from './components/ui'
import { RecordPage } from './features/record/RecordPage'
import { TripDetailPage } from './features/trips/TripDetailPage'
import { TripsPage } from './features/trips/TripsPage'
import { useRoute } from './hooks/useRoute'
import { useTripData } from './providers/data'

export function App() {
  const { ready, saveError } = useTripData()
  const [route, go] = useRoute()

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <UpdatePrompt />
      <Header route={route} onGo={go} />
      {saveError && (
        <p role="alert" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          {saveError}
        </p>
      )}
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 md:pb-10">
        {!ready ? (
          <p className={mutedText}>Loading your trips…</p>
        ) : route.name === 'trip' ? (
          <TripDetailPage id={route.id} onBack={() => go('trips')} />
        ) : route.name === 'trips' ? (
          <TripsPage onGo={go} />
        ) : (
          <RecordPage onFinished={(id) => go({ trip: id })} />
        )}
      </main>
      <TabBar route={route} onGo={go} />
    </div>
  )
}
