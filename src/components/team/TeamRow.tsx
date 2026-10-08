import type { Team } from '../../api/types.ts'
import { Crest } from '../common/Crest.tsx'
import { FavoriteToggle } from '../favorites/FavoriteToggle.tsx'

interface TeamRowProps {
  team: Team
  favorite: boolean
  favoriteReady: boolean
  onToggleFavorite: () => void
  onOpen: (team: Team, trigger: HTMLButtonElement) => void
}

/** A team in a list: the name opens its team screen, the star follows it. */
export function TeamRow({ team, favorite, favoriteReady, onToggleFavorite, onOpen }: TeamRowProps) {
  return (
    <div className="flex items-center gap-1 pr-2.5">
      <button
        type="button"
        onClick={(event) => onOpen(team, event.currentTarget)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-4 py-2 text-left text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Crest src={team.logo} name={team.name} />
        <span className="min-w-0 flex-1 truncate text-foreground">{team.name}</span>
      </button>
      <FavoriteToggle
        name={team.name}
        pressed={favorite}
        disabled={!favoriteReady}
        onToggle={onToggleFavorite}
      />
    </div>
  )
}
