import { MapPin } from 'lucide-react'
import { competitionNames, type LocalLeagueSuggestion } from '../../lib/localLeague.ts'
import { secondaryButtonClass } from '../matches/status.ts'

interface LocalLeagueCardProps {
  suggestion: LocalLeagueSuggestion
  onFollow: () => void
  onDismiss: () => void
}

/** One-time offer to follow the user's local league; all text is static. */
export function LocalLeagueCard({ suggestion, onFollow, onDismiss }: LocalLeagueCardProps) {
  return (
    <section
      aria-labelledby="home-local-title"
      className="mx-3 mt-3 rounded-2xl border border-accent/40 bg-background p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <MapPin aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="home-local-title" className="text-sm font-semibold text-foreground">
            {suggestion.label}
          </h2>
          <p id="home-local-detail" className="mt-0.5 text-xs text-muted">
            {competitionNames(suggestion.competitionIds).join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onDismiss} className={secondaryButtonClass}>
          No thanks
        </button>
        <button
          type="button"
          onClick={onFollow}
          aria-describedby="home-local-detail"
          className="rounded-md border border-accent bg-accent px-3 py-1.5 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Follow
        </button>
      </div>
    </section>
  )
}
