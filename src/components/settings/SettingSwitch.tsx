import { useId } from 'react'

interface SettingSwitchProps {
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onToggle: () => void
}

/** An on/off setting row with a labeled, described `role="switch"` button. */
export function SettingSwitch({ label, description, checked, disabled, onToggle }: SettingSwitchProps) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p id={`${id}-label`} className="text-sm font-medium text-foreground">
          {label}
        </p>
        <p id={`${id}-help`} className="text-xs text-muted">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-help`}
        disabled={disabled}
        onClick={onToggle}
        className="flex shrink-0 items-center gap-2 rounded-full text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={`flex h-5 w-9 items-center rounded-full border p-0.5 ${
            checked ? 'justify-end border-accent bg-accent' : 'justify-start border-border bg-surface'
          }`}
        >
          <span className="size-3.5 rounded-full bg-background shadow" />
        </span>
        <span aria-hidden="true" className="w-6 text-left">
          {checked ? 'On' : 'Off'}
        </span>
      </button>
    </div>
  )
}
