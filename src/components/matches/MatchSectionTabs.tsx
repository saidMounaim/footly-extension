import { useRef, type KeyboardEvent } from 'react'
import { tabIndexForKey } from '../../lib/tabs.ts'
import { SECTION_LABELS, sectionPanelId, sectionTabId, type MatchSection } from './tabs.ts'

interface MatchSectionTabsProps {
  sections: MatchSection[]
  active: MatchSection
  onChange: (section: MatchSection) => void
}

export function MatchSectionTabs({ sections, active, onChange }: MatchSectionTabsProps) {
  const buttons = useRef(new Map<MatchSection, HTMLButtonElement>())

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = tabIndexForKey(event.key, sections.indexOf(active), sections.length)
    if (next === undefined) return
    event.preventDefault()
    onChange(sections[next])
    buttons.current.get(sections[next])?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Match sections"
      onKeyDown={onKeyDown}
      className="mx-3 mb-1 flex gap-1 rounded-full border border-border bg-surface p-1"
    >
      {sections.map((section) => {
        const selected = section === active
        return (
          <button
            key={section}
            ref={(element) => {
              if (element) buttons.current.set(section, element)
              else buttons.current.delete(section)
            }}
            type="button"
            role="tab"
            id={sectionTabId(section)}
            aria-selected={selected}
            aria-controls={sectionPanelId(section)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(section)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              selected
                ? 'bg-background font-semibold text-foreground shadow-sm'
                : 'font-normal text-muted hover:text-foreground'
            }`}
          >
            {SECTION_LABELS[section]}
          </button>
        )
      })}
    </div>
  )
}
