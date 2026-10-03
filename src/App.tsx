import { MatchList } from './components/matches/MatchList.tsx'
import { useUpcomingMatches } from './hooks/useUpcomingMatches.ts'

function App() {
  const { state, retry } = useUpcomingMatches()

  return (
    <div className="flex min-h-[480px] flex-col">
      <header className="border-b border-border bg-surface px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Foot<span className="text-accent">ly</span>
        </h1>
      </header>
      <main className="flex-1">
        <MatchList state={state} onRetry={retry} />
      </main>
    </div>
  )
}

export default App
