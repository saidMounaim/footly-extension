import { useCallback, useRef, useState } from 'react'
import type { Match } from './api/types.ts'
import { MatchDetail } from './components/matches/MatchDetail.tsx'
import { MatchList } from './components/matches/MatchList.tsx'
import { useUpcomingMatches } from './hooks/useUpcomingMatches.ts'

function App() {
  const { state, retry } = useUpcomingMatches()
  const [selected, setSelected] = useState<Match | null>(null)
  const returnTo = useRef<{ trigger: HTMLButtonElement; scrollY: number } | null>(null)

  const openMatch = useCallback((match: Match, trigger: HTMLButtonElement) => {
    returnTo.current = { trigger, scrollY: window.scrollY }
    setSelected(match)
    window.scrollTo(0, 0)
  }, [])

  const closeMatch = useCallback(() => {
    setSelected(null)
    const target = returnTo.current
    returnTo.current = null
    if (!target) return
    // Wait for the list to be shown again before restoring scroll and focus.
    requestAnimationFrame(() => {
      window.scrollTo(0, target.scrollY)
      target.trigger.focus({ preventScroll: true })
    })
  }, [])

  return (
    <div className="flex min-h-[480px] flex-col">
      <header className="border-b border-border bg-surface px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Foot<span className="text-accent">ly</span>
        </h1>
      </header>
      <main className="flex-1">
        <div hidden={selected !== null}>
          <MatchList state={state} onRetry={retry} onSelect={openMatch} />
        </div>
        {selected && <MatchDetail key={selected.id} match={selected} onBack={closeMatch} />}
      </main>
    </div>
  )
}

export default App
