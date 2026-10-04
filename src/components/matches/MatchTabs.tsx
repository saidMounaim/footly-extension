import { useRef, type KeyboardEvent } from 'react'
import { MATCH_TABS, panelId, tabId, type MatchTab } from './tabs.ts'

interface MatchTabsProps {
  active: MatchTab
  onChange: (tab: MatchTab) => void
}

export function MatchTabs({ active, onChange }: MatchTabsProps) {
  const buttons = useRef(new Map<MatchTab, HTMLButtonElement>())

  function select(index: number) {
    const tab = MATCH_TABS[(index + MATCH_TABS.length) % MATCH_TABS.length].id
    onChange(tab)
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
      className="flex border-b border-border"
    >
      {MATCH_TABS.map(({ id, label }) => {
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
            onClick={() => onChange(id)}
            className={`flex-1 border-b-2 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
              selected
                ? 'border-accent font-semibold text-foreground'
                : 'border-transparent font-normal text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
