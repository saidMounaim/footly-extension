export type MatchTab = 'upcoming' | 'results' | 'favorites'

/** Tabs that show a match list. */
export type ListTab = Exclude<MatchTab, 'favorites'>

export const MATCH_TABS: { id: MatchTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
  { id: 'favorites', label: 'Favorites' },
]

export const tabId = (tab: MatchTab) => `tab-${tab}`
export const panelId = (tab: MatchTab) => `panel-${tab}`
