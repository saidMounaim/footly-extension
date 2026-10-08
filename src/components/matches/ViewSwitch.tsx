import { useRef, type KeyboardEvent } from 'react'
import type { ListTab } from './tabs.ts'

const VIEWS: { id: ListTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
]

interface ViewSwitchProps {
  view: ListTab
  onChange: (view: ListTab) => void
  /** Id of the heading that names the switch. */
  labelledBy: string
}

/** The Upcoming / Results pill switch, a radio group with arrow-key movement. */
export function ViewSwitch({ view, onChange, labelledBy }: ViewSwitchProps) {
  const buttons = useRef(new Map<ListTab, HTMLButtonElement>())

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = view === 'upcoming' ? 'results' : 'upcoming'
    const choice = event.key === 'Home' ? 'upcoming' : event.key === 'End' ? 'results' : next
    onChange(choice)
    buttons.current.get(choice)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className="mx-3 mt-3 flex rounded-full border border-border bg-surface p-1"
    >
      {VIEWS.map(({ id, label }) => {
        const checked = id === view
        return (
          <button
            key={id}
            ref={(element) => {
              if (element) buttons.current.set(id, element)
              else buttons.current.delete(id)
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(id)}
            className={`flex-1 rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              checked
                ? 'bg-background font-semibold text-foreground shadow-sm'
                : 'font-medium text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
