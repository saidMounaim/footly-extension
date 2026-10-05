import { useRef, type KeyboardEvent } from 'react'
import { MATCH_TABS, panelId, tabId, type MatchTab } from './tabs.ts'

interface MatchTabsProps {
  active: MatchTab
  /** `via` tells a click apart from arrow-key navigation, which must keep focus on the tab. */
  onChange: (tab: MatchTab, via: 'click' | 'key') => void
}

export function MatchTabs({ active, onChange }: MatchTabsProps) {
  const buttons = useRef(new Map<MatchTab, HTMLButtonElement>())

  function select(index: number) {
    const tab = MATCH_TABS[(index + MATCH_TABS.length) % MATCH_TABS.length].id
    onChange(tab, 'key')
    buttons.current.get(tab)?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = MATCH_TABS.findIndex((tab) => tab.id === active)
    const next = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: MATCH_TABS.length - 1,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    select(next)
  }

  return (
    <div
      role="tablist"
      aria-label="Matches"
      onKeyDown={onKeyDown}
      className="sticky bottom-0 flex border-t border-border bg-background/90 backdrop-blur"
    >
      {MATCH_TABS.map(({ id, label, icon: Icon }) => {
        const selected = id === active
        return (
          <button
            key={id}
            ref={(element) => {
              if (element) buttons.current.set(id, element)
              else buttons.current.delete(id)
            }}
            type="button"
            role="tab"
            id={tabId(id)}
            aria-selected={selected}
            aria-controls={panelId(id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id, 'click')}
            className={`group flex flex-1 flex-col items-center gap-0.5 px-1 pt-1.5 pb-1.5 text-xs focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
              selected ? 'font-semibold text-accent' : 'font-normal text-muted hover:text-foreground'
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                selected ? 'bg-accent/15' : 'group-hover:bg-surface'
              }`}
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}
