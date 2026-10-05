export type MatchTab = 'home' | 'upcoming' | 'results' | 'favorites' | 'search'

/** Tabs that show a match list. */
export type ListTab = Exclude<MatchTab, 'home' | 'favorites' | 'search'>

export const MATCH_TABS: { id: MatchTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'search', label: 'Search' },
]

export const tabId = (tab: MatchTab) => `tab-${tab}`
export const panelId = (tab: MatchTab) => `panel-${tab}`
