import { useRef, type KeyboardEvent } from 'react'
import { dayLabel } from '../../lib/date.ts'

interface DayChipsProps {
  /** Local day keys (`YYYY-MM-DD`) that have matches, in display order. */
  days: string[]
  /** The chosen day key, or null for All. */
  selected: string | null
  onChange: (day: string | null) => void
  /** "Now" for Today/Tomorrow labels. */
  now: Date
  label: string
}

/** Noon on the key's local day, so labels never slip a day around midnight. */
function dayDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

/** A row of single-choice chips (All plus each day) with arrow-key navigation. */
export function DayChips({ days, selected, onChange, now, label }: DayChipsProps) {
  const options: (string | null)[] = [null, ...days]
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const current = Math.max(0, options.indexOf(selected))

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: options.length - 1 }[
      event.key
    ]
    if (next === undefined) return
    event.preventDefault()
    const choice = options[(next + options.length) % options.length]
    onChange(choice)
    buttons.current.get(choice ?? 'all')?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1 [scrollbar-width:none]"
    >
      {options.map((day) => {
        const checked = day === selected
        return (
          <button
            key={day ?? 'all'}
            ref={(element) => {
              if (element) buttons.current.set(day ?? 'all', element)
              else buttons.current.delete(day ?? 'all')
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(day)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              checked
                ? 'border-accent bg-accent font-semibold text-background'
                : 'border-border font-medium text-foreground hover:bg-surface'
            }`}
          >
            {day === null ? 'All' : dayLabel(dayDate(day), now)}
          </button>
        )
      })}
    </div>
  )
}
