import type { Team } from '../../api/types.ts'
import type { FavoriteTeam } from '../../lib/favorites.ts'

interface TeamToggleProps {
  team: Team | FavoriteTeam
  pressed: boolean
  disabled?: boolean
  onToggle: (team: Team | FavoriteTeam) => void
  /** Show the team name next to the star (search results) or only the star. */
  showName?: boolean
}

function favoriteLabel(name: string, pressed: boolean): string {
  return pressed ? `Remove ${name} from favorites` : `Add ${name} to favorites`
}

export function TeamToggle({
  team,
  pressed,
  disabled = false,
  onToggle,
  showName = false,
}: TeamToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      aria-label={favoriteLabel(team.name, pressed)}
      onClick={() => onToggle(team)}
      className={`flex items-center gap-2 rounded-md text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${
        showName ? 'w-full px-4 py-2 text-left' : 'shrink-0 px-1.5 py-0.5'
      }`}
    >
      {showName && <span className="min-w-0 flex-1 truncate text-foreground">{team.name}</span>}
      <span aria-hidden="true" className={pressed ? 'text-accent' : 'text-muted'}>
        {pressed ? '★' : '☆'}
      </span>
    </button>
  )
}
