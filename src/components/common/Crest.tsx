import { Trophy } from 'lucide-react'
import { useState } from 'react'
import { initials, safeImageUrl } from '../../lib/crest.ts'

type CrestSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<CrestSize, string> = {
  sm: 'size-4 text-[7px]',
  md: 'size-5 text-[8px]',
  lg: 'size-10 text-xs',
}

interface CrestProps {
  /** Untrusted logo URL from the provider or storage; only https: URLs are shown. */
  src: string | undefined
  /** Team or competition name, used for the initials fallback. */
  name: string
  size?: CrestSize
  kind?: 'team' | 'competition'
}

const frameClass = 'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border'

/**
 * A decorative club crest or competition logo (the name is always shown beside
 * it). Falls back to initials, or a trophy for competitions, at the same size.
 */
export function Crest({ src, name, size = 'md', kind = 'team' }: CrestProps) {
  const url = safeImageUrl(src)
  // Keyed by URL so a reused row never keeps an earlier image's failed state.
  return <CrestImage key={url ?? ''} url={url} name={name} size={size} kind={kind} />
}

function CrestImage({
  url,
  name,
  size,
  kind,
}: {
  url: string | undefined
  name: string
  size: CrestSize
  kind: 'team' | 'competition'
}) {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return (
      <span
        aria-hidden="true"
        className={`${frameClass} ${SIZE_CLASS[size]} border-border bg-crest-backdrop`}
      >
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-[80%] object-contain"
        />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`${frameClass} ${SIZE_CLASS[size]} border-border bg-surface font-semibold text-muted`}
    >
      {kind === 'competition' ? <Trophy className="size-[65%]" /> : initials(name)}
    </span>
  )
}
