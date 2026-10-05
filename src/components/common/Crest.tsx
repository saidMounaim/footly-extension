import { Trophy } from 'lucide-react'
import { useState } from 'react'
import { initials, safeImageUrl, sizedCrestUrl } from '../../lib/crest.ts'

type CrestSize = 'sm' | 'md' | 'lg'

/** Display classes and the requested image size (2× the 16, 20, and 40px display) from one map. */
const SIZES: Record<CrestSize, { className: string; px: number }> = {
  sm: { className: 'size-4 text-[7px]', px: 32 },
  md: { className: 'size-5 text-[8px]', px: 40 },
  lg: { className: 'size-10 text-xs', px: 80 },
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
  // Keyed by URL so a reused row never keeps an earlier image's fallback stage.
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
  // Resized image first, then the original once, then the fallback.
  const [stage, setStage] = useState<'sized' | 'original' | 'failed'>('sized')
  if (url && stage !== 'failed') {
    const imageUrl = stage === 'sized' ? sizedCrestUrl(url, SIZES[size].px) : url
    const next = stage === 'sized' && imageUrl !== url ? 'original' : 'failed'
    return (
      <span
        aria-hidden="true"
        className={`${frameClass} ${SIZES[size].className} border-border bg-crest-backdrop`}
      >
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setStage(next)}
          className="size-[80%] object-contain"
        />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`${frameClass} ${SIZES[size].className} border-border bg-surface font-semibold text-muted`}
    >
      {kind === 'competition' ? <Trophy className="size-[65%]" /> : initials(name)}
    </span>
  )
}
