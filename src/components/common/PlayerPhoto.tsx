import { useState } from 'react'
import { safeImageUrl, sizedCrestUrl } from '../../lib/crest.ts'

/** Requested image size: 2× the 28px display. */
const IMAGE_PX = 56

interface PlayerPhotoProps {
  /** Untrusted headshot URL from the provider; only https: URLs are shown. */
  src: string | undefined
  jersey: string | undefined
}

/**
 * A decorative player headshot with the shirt number as a badge, falling back
 * to the number disc when there is no photo or it fails to load. Callers give
 * the number and name to screen readers.
 */
export function PlayerPhoto({ src, jersey }: PlayerPhotoProps) {
  const url = safeImageUrl(src)
  // Keyed by URL so a reused row never keeps an earlier image's fallback stage.
  return <PhotoImage key={url ?? ''} url={url} jersey={jersey} />
}

function PhotoImage({ url, jersey }: { url: string | undefined; jersey: string | undefined }) {
  // Resized image first, then the original once, then the number disc.
  const [stage, setStage] = useState<'sized' | 'original' | 'failed'>('sized')
  if (url && stage !== 'failed') {
    const imageUrl = stage === 'sized' ? sizedCrestUrl(url, IMAGE_PX) : url
    const next = stage === 'sized' && imageUrl !== url ? 'original' : 'failed'
    return (
      <span aria-hidden="true" className="relative inline-flex size-7 shrink-0">
        <span className="size-full overflow-hidden rounded-full border border-border bg-surface">
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setStage(next)}
            className="size-full object-cover object-top"
          />
        </span>
        {jersey && (
          <span className="absolute -right-1 -bottom-1 min-w-4 rounded-full border border-border bg-background px-0.5 text-center text-[9px] leading-4 font-bold tabular-nums text-foreground">
            {jersey}
          </span>
        )}
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-bold tabular-nums text-foreground"
    >
      {jersey}
    </span>
  )
}
