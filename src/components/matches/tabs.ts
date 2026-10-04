export type MatchTab = 'upcoming' | 'results'

export const MATCH_TABS: { id: MatchTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
]

export const tabId = (tab: MatchTab) => `tab-${tab}`
export const panelId = (tab: MatchTab) => `panel-${tab}`
