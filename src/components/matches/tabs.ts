import { CalendarDays, History, House, Search, Star, type LucideIcon } from 'lucide-react'

export type MatchTab = 'home' | 'upcoming' | 'results' | 'favorites' | 'search'

/** Tabs that show a match list. */
export type ListTab = Exclude<MatchTab, 'home' | 'favorites' | 'search'>

export const MATCH_TABS: { id: MatchTab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarDays },
  { id: 'results', label: 'Results', icon: History },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'search', label: 'Search', icon: Search },
]

export const tabId = (tab: MatchTab) => `tab-${tab}`
export const panelId = (tab: MatchTab) => `panel-${tab}`
