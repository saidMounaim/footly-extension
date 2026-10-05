import { Star } from 'lucide-react'
import type { ReactNode } from 'react'

interface FavoriteToggleProps {
  /** Team or competition name, used in the label. */
  name: string
  pressed: boolean
  disabled?: boolean
  onToggle: () => void
  /** Show the name next to the star (lists) or only the star. */
  showName?: boolean
  /** Decorative crest or logo shown before the name in lists. */
  icon?: ReactNode
}

function favoriteLabel(name: string, pressed: boolean): string {
  return pressed ? `Remove ${name} from favorites` : `Add ${name} to favorites`
}

export function FavoriteToggle({
  name,
  pressed,
  disabled = false,
  onToggle,
  showName = false,
  icon,
}: FavoriteToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      aria-label={favoriteLabel(name, pressed)}
      onClick={onToggle}
      className={`flex items-center gap-2 rounded-md text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${
        showName ? 'w-full px-4 py-2 text-left' : 'shrink-0 px-1.5 py-0.5'
      }`}
    >
      {showName && icon}
      {showName && <span className="min-w-0 flex-1 truncate text-foreground">{name}</span>}
      <Star
        aria-hidden="true"
        className={`size-4 shrink-0 ${pressed ? 'fill-current text-accent' : 'text-muted'}`}
      />
    </button>
  )
}
