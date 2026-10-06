import { Settings } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Match, Team } from './api/types.ts'
import { FavoritesPanel } from './components/favorites/FavoritesPanel.tsx'
import { HomePanel } from './components/home/HomePanel.tsx'
import { LocalLeagueCard } from './components/home/LocalLeagueCard.tsx'
import { MatchDetail } from './components/matches/MatchDetail.tsx'
import { MatchList } from './components/matches/MatchList.tsx'
import { MatchTabs } from './components/matches/MatchTabs.tsx'
import { MATCH_TABS, panelId, tabId, type MatchTab } from './components/matches/tabs.ts'
import { SearchPanel } from './components/search/SearchPanel.tsx'
import { SettingsPanel } from './components/settings/SettingsPanel.tsx'
import { useFavoriteCompetitions } from './hooks/useFavoriteCompetitions.ts'
import { useFavoriteTeams } from './hooks/useFavoriteTeams.ts'
import { useKickoffChecks } from './hooks/useKickoffChecks.ts'
import { useLiveRefresh } from './hooks/useLiveRefresh.ts'
import { useLiveRefreshSetting } from './hooks/useLiveRefreshSetting.ts'
import { useMatchList } from './hooks/useMatchList.ts'
import { useNotificationsSetting } from './hooks/useNotificationsSetting.ts'
import { useNotificationTypes } from './hooks/useNotificationTypes.ts'
import { useNow } from './hooks/useNow.ts'
import { useOnlineStatus } from './hooks/useOnlineStatus.ts'
import { useTeamCatalog } from './hooks/useTeamCatalog.ts'
import { useLocalLeagueSuggestion } from './hooks/useLocalLeagueSuggestion.ts'
import { useThemeSetting } from './hooks/useThemeSetting.ts'
import { collectLogos } from './lib/crest.ts'

const NO_MATCHES: Match[] = []
const NO_TEAMS: Team[] = []

function App() {
  const competitions = useFavoriteCompetitions()
  // Wait for followed competitions before the first load, unless they can't be read.
  const followedIds = competitions.ready || competitions.loadError ? competitions.ids : null
  // Only offer a league once the followed list really loaded, so nothing is re-followed by mistake.
  const localLeague = useLocalLeagueSuggestion(competitions.ready ? competitions.ids : null)
  const { state, retry, refresh } = useMatchList(followedIds)
  const online = useOnlineStatus()
  const listStatus = state.status === 'success' && state.stale ? 'stale' : state.status
  const wasOnline = useRef(online)
  const latest = useRef({ listStatus, retry, refresh })
  useEffect(() => {
    latest.current = { listStatus, retry, refresh }
  })

  // Reload by itself once the connection is back; only that transition triggers it.
  useEffect(() => {
    const reconnected = online && !wasOnline.current
    wasOnline.current = online
    if (!reconnected) return
    const current = latest.current
    if (current.listStatus === 'error') current.retry()
    else if (current.listStatus === 'stale') void current.refresh()
  }, [online])

  const now = useNow(30_000)
  const upcoming = useMemo(
    () => (state.status === 'success' ? state.result.upcoming : NO_MATCHES),
    [state],
  )
  useKickoffChecks(upcoming, refresh)
  const favorites = useFavoriteTeams()
  const notifications = useNotificationsSetting()
  const notificationTypes = useNotificationTypes()
  const liveRefresh = useLiveRefreshSetting()
  const theme = useThemeSetting()
  const liveRefreshMs = liveRefresh.minutes * 60_000
  useLiveRefresh(upcoming, refresh, liveRefreshMs)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsButton = useRef<HTMLButtonElement>(null)
  const [tab, setTab] = useState<MatchTab>('home')
  const [searchFocus, setSearchFocus] = useState(0)
  const catalog = useTeamCatalog(tab === 'favorites', competitions.ids)
  // The catalog hook returns a fresh state object each render, so depend on its stable teams array.
  const catalogTeams = catalog.state.status === 'success' ? catalog.state.result.teams : NO_TEAMS
  const logos = useMemo(
    () =>
      collectLogos(
        state.status === 'success' ? [...state.result.upcoming, ...state.result.results] : NO_MATCHES,
        catalogTeams,
      ),
    [state, catalogTeams],
  )
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

  const openSettings = useCallback(() => setSettingsOpen(true), [])

  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
    // Wait for the gear to be shown again before focusing it.
    requestAnimationFrame(() => settingsButton.current?.focus())
  }, [])

  const manageFavorites = useCallback(() => {
    setSettingsOpen(false)
    setSelected(null)
    returnTo.current = null
    changeTab('favorites', 'click')
    requestAnimationFrame(() => document.getElementById(tabId('favorites'))?.focus())
  }, [changeTab])

  /** After the card goes away, keep focus on Home instead of losing it to the page. */
  const focusHome = useCallback(() => {
    requestAnimationFrame(() => {
      const target =
        document.getElementById('home-live') ??
        document.getElementById('home-next') ??
        document.getElementById(tabId('home'))
      target?.focus()
    })
  }, [])

  const followLocalLeague = useCallback(() => {
    const suggestion = localLeague.suggestion
    if (!suggestion) return
    // Only add what isn't followed yet; toggling a followed one would unfollow it.
    for (const id of suggestion.competitionIds) {
      if (!competitions.isFavorite(id)) competitions.toggle(id)
    }
    localLeague.answer('accepted')
    focusHome()
  }, [localLeague, competitions, focusHome])

  const dismissLocalLeague = useCallback(() => {
    localLeague.answer('dismissed')
    focusHome()
  }, [localLeague, focusHome])

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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur">
        <h1 className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-foreground">
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          Foot<span className="-ml-1.5 text-accent">ly</span>
        </h1>
        <button
          ref={settingsButton}
          type="button"
          onClick={openSettings}
          hidden={settingsOpen}
          aria-label="Settings"
          className="rounded-full border border-border p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Settings aria-hidden="true" className="size-5" />
        </button>
      </header>
      <main className="flex flex-1 flex-col">
        {!online && (listStatus === 'success' || listStatus === 'loading') && (
          <p role="status" className="border-b border-border px-4 py-2 text-xs text-muted">
            You're offline. Scores won't update until you reconnect.
          </p>
        )}
        {(favorites.saveError ||
          competitions.saveError ||
          notifications.saveError ||
          notificationTypes.saveError ||
          liveRefresh.saveError ||
          theme.saveError ||
          localLeague.saveError) && (
          <p role="alert" className="border-b border-border px-4 py-2 text-xs text-foreground">
            Couldn't save your changes. Try again.
          </p>
        )}
        <div className={selected || settingsOpen ? 'hidden' : 'flex flex-1 flex-col'}>
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
                <>
                  {localLeague.suggestion && (
                    <LocalLeagueCard
                      suggestion={localLeague.suggestion}
                      onFollow={followLocalLeague}
                      onDismiss={dismissLocalLeague}
                    />
                  )}
                  <HomePanel
                    state={state}
                    favoriteIds={favorites.favoriteIds}
                    competitionIds={competitions.idSet}
                    now={now}
                    active={tab === 'home' && selected === null && !settingsOpen}
                    liveRefreshMs={liveRefreshMs}
                    onRetry={retry}
                    onSelect={openMatch}
                    onOpenFavorites={openFavorites}
                  />
                </>
              ) : id === 'favorites' ? (
                <FavoritesPanel
                  favorites={favorites}
                  competitions={competitions}
                  catalog={catalog.state}
                  logos={logos}
                  onRetryCatalog={catalog.retry}
                />
              ) : id === 'search' ? (
                <SearchPanel
                  state={state}
                  onRetry={retry}
                  now={now}
                  favorites={favorites}
                  competitions={competitions}
                  logos={logos}
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
        {settingsOpen && (
          <SettingsPanel
            theme={theme}
            notifications={notifications}
            types={notificationTypes}
            refresh={liveRefresh}
            favorites={favorites}
            competitions={competitions}
            onBack={closeSettings}
            onManageFavorites={manageFavorites}
          />
        )}
        {selected && !settingsOpen && (
          <MatchDetail
            key={selected.id}
            match={selected}
            favorites={favorites}
            liveRefreshMs={liveRefreshMs}
            onBack={closeMatch}
          />
        )}
      </main>
    </div>
  )
}

export default App
