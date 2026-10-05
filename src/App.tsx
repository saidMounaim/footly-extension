import { useCallback, useMemo, useRef, useState } from 'react'
import type { Match } from './api/types.ts'
import { FavoritesPanel } from './components/favorites/FavoritesPanel.tsx'
import { HomePanel } from './components/home/HomePanel.tsx'
import { MatchDetail } from './components/matches/MatchDetail.tsx'
import { MatchList } from './components/matches/MatchList.tsx'
import { MatchTabs } from './components/matches/MatchTabs.tsx'
import { MATCH_TABS, panelId, tabId, type MatchTab } from './components/matches/tabs.ts'
import { SearchPanel } from './components/search/SearchPanel.tsx'
import { useFavoriteCompetitions } from './hooks/useFavoriteCompetitions.ts'
import { useFavoriteTeams } from './hooks/useFavoriteTeams.ts'
import { useKickoffChecks } from './hooks/useKickoffChecks.ts'
import { useLiveRefresh } from './hooks/useLiveRefresh.ts'
import { useMatchList } from './hooks/useMatchList.ts'
import { useNotificationsSetting } from './hooks/useNotificationsSetting.ts'
import { useNow } from './hooks/useNow.ts'
import { useTeamCatalog } from './hooks/useTeamCatalog.ts'

const NO_MATCHES: Match[] = []

function App() {
  const { state, retry, refresh } = useMatchList()
  const now = useNow(30_000)
  const upcoming = useMemo(
    () => (state.status === 'success' ? state.result.upcoming : NO_MATCHES),
    [state],
  )
  useKickoffChecks(upcoming, refresh)
  useLiveRefresh(upcoming, refresh)
  const favorites = useFavoriteTeams()
  const competitions = useFavoriteCompetitions()
  const notifications = useNotificationsSetting()
  const [tab, setTab] = useState<MatchTab>('home')
  const [searchFocus, setSearchFocus] = useState(0)
  const catalog = useTeamCatalog(tab === 'favorites')
  const [selected, setSelected] = useState<Match | null>(null)
  const returnTo = useRef<{ trigger: HTMLButtonElement; scrollY: number } | null>(null)

  const changeTab = useCallback((next: MatchTab, via: 'click' | 'key') => {
    setTab(next)
    if (next === 'search' && via === 'click') setSearchFocus((n) => n + 1)
  }, [])

  const openMatch = useCallback((match: Match, trigger: HTMLButtonElement) => {
    returnTo.current = { trigger, scrollY: window.scrollY }
    setSelected(match)
    window.scrollTo(0, 0)
  }, [])

  const openFavorites = useCallback(() => changeTab('favorites', 'click'), [changeTab])

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
      <main className="flex flex-1 flex-col">
        {(favorites.saveError || competitions.saveError || notifications.saveError) && (
          <p role="alert" className="border-b border-border px-4 py-2 text-xs text-foreground">
            Couldn't save your favorites. Try again.
          </p>
        )}
        <div className={selected ? 'hidden' : 'flex flex-1 flex-col'}>
          {MATCH_TABS.map(({ id }) => (
            <div
              key={id}
              role="tabpanel"
              id={panelId(id)}
              aria-labelledby={tabId(id)}
              hidden={id !== tab}
              className="flex-1"
            >
              {id === 'home' ? (
                <HomePanel
                  state={state}
                  favoriteIds={favorites.favoriteIds}
                  competitionIds={competitions.idSet}
                  now={now}
                  active={tab === 'home' && selected === null}
                  onRetry={retry}
                  onSelect={openMatch}
                  onOpenFavorites={openFavorites}
                />
              ) : id === 'favorites' ? (
                <FavoritesPanel
                  favorites={favorites}
                  competitions={competitions}
                  notifications={notifications}
                  catalog={catalog.state}
                  onRetryCatalog={catalog.retry}
                />
              ) : id === 'search' ? (
                <SearchPanel
                  state={state}
                  onRetry={retry}
                  now={now}
                  favorites={favorites}
                  competitions={competitions}
                  onSelect={openMatch}
                  focusRequest={searchFocus}
                />
              ) : (
                <MatchList
                  state={state}
                  view={id}
                  favoriteIds={favorites.favoriteIds}
                  competitionIds={competitions.idSet}
                  now={now}
                  onRetry={retry}
                  onSelect={openMatch}
                />
              )}
            </div>
          ))}
          <MatchTabs active={tab} onChange={changeTab} />
        </div>
        {selected && (
          <MatchDetail
            key={selected.id}
            match={selected}
            favorites={favorites}
            onBack={closeMatch}
          />
        )}
      </main>
    </div>
  )
}

export default App
