import { useEffect, useRef } from 'react'
import type { FavoriteCompetitionsApi } from '../../hooks/useFavoriteCompetitions.ts'
import type { FavoriteTeamsApi } from '../../hooks/useFavoriteTeams.ts'
import type { LiveRefreshSettingApi } from '../../hooks/useLiveRefreshSetting.ts'
import type { NotificationsSettingApi } from '../../hooks/useNotificationsSetting.ts'
import type { NotificationTypesApi } from '../../hooks/useNotificationTypes.ts'
import type { ThemeSettingApi } from '../../hooks/useThemeSetting.ts'
import { LIVE_REFRESH_OPTIONS, THEME_OPTIONS, type NotificationType, type Theme } from '../../lib/settings.ts'
import { sectionHeadingClass, secondaryButtonClass } from '../matches/status.ts'
import { SettingSwitch } from './SettingSwitch.tsx'

interface SettingsPanelProps {
  theme: ThemeSettingApi
  notifications: NotificationsSettingApi
  types: NotificationTypesApi
  refresh: LiveRefreshSettingApi
  favorites: FavoriteTeamsApi
  competitions: FavoriteCompetitionsApi
  onBack: () => void
  onManageFavorites: () => void
}

const TYPE_SWITCHES: { type: NotificationType; label: string; description: string }[] = [
  { type: 'matchUpdates', label: 'Match updates', description: 'Kick-off, half-time, and full-time.' },
  { type: 'goals', label: 'Goals', description: 'Goals, penalties, and own goals.' },
  { type: 'redCards', label: 'Red cards', description: 'Sending-offs for either team.' },
]

const THEME_LABEL: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' }

const MASTER_OFF_HELP = 'Turn on match notifications to choose types.'

function LoadError() {
  return (
    <p role="alert" className="px-4 pt-2 text-xs text-foreground">
      Couldn't load this setting.
    </p>
  )
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export function SettingsPanel({
  theme,
  notifications,
  types,
  refresh,
  favorites,
  competitions,
  onBack,
  onManageFavorites,
}: SettingsPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back from settings"
          className="rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-semibold text-foreground focus:outline-none"
        >
          Settings
        </h2>
      </div>

      <section aria-labelledby="settings-appearance">
        <h3 id="settings-appearance" className={sectionHeadingClass}>
          Appearance
        </h3>
        {theme.loadError && <LoadError />}
        <fieldset disabled={!theme.ready} className="px-4 py-3 disabled:opacity-50">
          <legend className="text-sm font-medium text-foreground">Theme</legend>
          <p className="text-xs text-muted">System follows your device's light or dark setting.</p>
          <div className="mt-2 flex gap-4">
            {THEME_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="radio"
                  name="settings-theme"
                  value={option}
                  checked={theme.theme === option}
                  onChange={() => theme.select(option)}
                  className="accent-accent"
                />
                {THEME_LABEL[option]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="settings-notifications">
        <h3 id="settings-notifications" className={sectionHeadingClass}>
          Notifications
        </h3>
        {(notifications.loadError || types.loadError) && <LoadError />}
        <div className="divide-y divide-border">
          <SettingSwitch
            label="Match notifications"
            description="Alerts for your favorite teams' matches."
            checked={notifications.enabled}
            disabled={!notifications.ready}
            onToggle={notifications.toggle}
          />
          {TYPE_SWITCHES.map(({ type, label, description }) => (
            <SettingSwitch
              key={type}
              label={label}
              description={notifications.enabled ? description : `${description} ${MASTER_OFF_HELP}`}
              checked={types.types[type]}
              disabled={!types.ready || !notifications.enabled}
              onToggle={() => types.toggle(type)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="settings-refresh">
        <h3 id="settings-refresh" className={sectionHeadingClass}>
          Live refresh
        </h3>
        {refresh.loadError && <LoadError />}
        <fieldset disabled={!refresh.ready} className="px-4 py-3 disabled:opacity-50">
          <legend className="text-sm font-medium text-foreground">Live match refresh</legend>
          <p className="text-xs text-muted">How often live scores update while Footly is open.</p>
          <div className="mt-2 flex gap-4">
            {LIVE_REFRESH_OPTIONS.map((minutes) => (
              <label key={minutes} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="radio"
                  name="settings-live-refresh"
                  value={minutes}
                  checked={refresh.minutes === minutes}
                  onChange={() => refresh.select(minutes)}
                  className="accent-accent"
                />
                {plural(minutes, 'minute')}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="settings-favorites">
        <h3 id="settings-favorites" className={sectionHeadingClass}>
          Favorites
        </h3>
        {(favorites.loadError || competitions.loadError) && <LoadError />}
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-foreground">
            {plural(favorites.teams.length, 'team')} ·{' '}
            {plural(competitions.ids.length, 'competition')}
          </p>
          <button type="button" onClick={onManageFavorites} className={secondaryButtonClass}>
            Manage favorites
          </button>
        </div>
      </section>
    </div>
  )
}
