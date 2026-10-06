import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { eraseFootlyData } from '../../lib/erase.ts'
import {
  CONTACTED_HOSTS,
  COUNTRY_GUESS_NOTE,
  PERMISSION_EXPLANATIONS,
} from '../../lib/privacy.ts'
import { pageStorage } from '../../lib/theme.ts'
import { cardClass, sectionHeadingClass, secondaryButtonClass } from '../matches/status.ts'

type EraseState = 'idle' | 'confirming' | 'erasing' | 'failed'

async function eraseAndReload() {
  await eraseFootlyData({
    storage: chrome.storage.local,
    alarms: chrome.alarms,
    page: pageStorage(),
  })
  location.reload()
}

function EraseControl() {
  const [state, setState] = useState<EraseState>('idle')
  const trigger = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)

  useEffect(() => {
    if (state === 'confirming') cancel.current?.focus()
    if (state === 'idle' && returnFocus.current) {
      returnFocus.current = false
      trigger.current?.focus()
    }
  }, [state])

  const close = () => {
    returnFocus.current = true
    setState('idle')
  }

  const erase = () => {
    setState('erasing')
    eraseAndReload().catch((error: unknown) => {
      console.error("Couldn't erase Footly data", error)
      setState('failed')
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && state !== 'erasing') {
      event.preventDefault()
      close()
    }
  }

  if (state === 'idle') {
    return (
      <div className="px-4 pt-3 pb-4">
        <button
          ref={trigger}
          type="button"
          onClick={() => setState('confirming')}
          className={secondaryButtonClass}
        >
          Erase Footly data
        </button>
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-labelledby="settings-erase-confirm"
      onKeyDown={onKeyDown}
      className="mx-3 mt-3 mb-4 rounded-xl border border-border p-3"
    >
      <p id="settings-erase-confirm" className="text-sm text-foreground">
        This removes your favorites, settings, and saved matches from this device.
      </p>
      {state === 'failed' && (
        <p role="alert" className="mt-2 text-xs text-foreground">
          Couldn't erase your data. Try again.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={erase}
          disabled={state === 'erasing'}
          className={secondaryButtonClass}
        >
          Erase
        </button>
        <button
          ref={cancel}
          type="button"
          onClick={close}
          disabled={state === 'erasing'}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/** What Footly can do, what it keeps, and who it talks to, plus erasing everything it stored. */
export function PrivacySection() {
  return (
    <section aria-labelledby="settings-privacy">
      <h3 id="settings-privacy" className={sectionHeadingClass}>
        Privacy & permissions
      </h3>
      <div className={`${cardClass} space-y-3 px-4 py-3 text-sm`}>
        <p className="text-foreground">
          Footly has no account and collects nothing about you. Your favorites and settings stay
          on this device.
        </p>
        <p className="text-xs text-muted">{COUNTRY_GUESS_NOTE}</p>
        <dl className="space-y-1.5">
          {PERMISSION_EXPLANATIONS.map(({ permission, label, reason }) => (
            <div key={permission}>
              <dt className="font-medium text-foreground">{label}</dt>
              <dd className="text-xs text-muted">{reason}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="font-medium text-foreground">Servers contacted</p>
          <ul className="mt-1 space-y-1 text-xs text-muted">
            {CONTACTED_HOSTS.map(({ host, purpose }) => (
              <li key={host}>
                <span className="font-mono text-foreground">{host}</span>: {purpose}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted">
            Like any web request, these reveal your IP address to ESPN. Footly sends nothing else
            about you.
          </p>
        </div>
      </div>
      <EraseControl />
    </section>
  )
}
