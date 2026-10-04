import { COMPETITIONS, getMatchDetails, getMatchList, MatchDetailsError } from './api/football.ts'
import type { MatchStatus } from './api/types.ts'
import { FAVORITE_TEAMS_KEY, loadFavoriteTeams, type StorageArea } from './lib/favorites.ts'
import {
  NOTIFICATIONS_ENABLED_KEY,
  loadNotificationsEnabled,
  loadWatchedMatches,
  mergePlan,
  notificationContent,
  notificationId,
  saveWatchedMatches,
  statusEvent,
  toMatch,
  watchAlarmNeedsReset,
  watchWindow,
  type WatchedMatch,
} from './lib/notifications.ts'

const PLAN_ALARM = 'footly-plan'
const WATCH_ALARM = 'footly-watch'
const storage: StorageArea = chrome.storage.local

// Plan and watch both rewrite the watched list, so they run one at a time.
let queue: Promise<void> = Promise.resolve()

function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch((error: unknown) => {
    console.error('Footly background task failed', error)
  })
}

/** Watch every minute while a match is due, otherwise wake up for the next kickoff. */
async function scheduleWatch(watched: WatchedMatch[], now: Date) {
  const { due, nextAt } = watchWindow(watched, now)
  if (due.length > 0) {
    const existing = await chrome.alarms.get(WATCH_ALARM)
    if (watchAlarmNeedsReset(existing?.scheduledTime, now)) {
      await chrome.alarms.create(WATCH_ALARM, { periodInMinutes: 1 })
    }
    return
  }
  await chrome.alarms.clear(WATCH_ALARM)
  if (nextAt) await chrome.alarms.create(WATCH_ALARM, { when: nextAt.getTime(), periodInMinutes: 1 })
}

async function stopWatching() {
  await chrome.alarms.clear(WATCH_ALARM)
  await saveWatchedMatches(storage, [])
}

async function plan() {
  const [enabled, favorites] = await Promise.all([
    loadNotificationsEnabled(storage),
    loadFavoriteTeams(storage),
  ])
  if (!enabled || favorites.length === 0) {
    await stopWatching()
    return
  }
  const [result, watched] = await Promise.all([getMatchList(), loadWatchedMatches(storage)])
  const now = new Date()
  if (result.failedCompetitionIds.length === COMPETITIONS.length) {
    await scheduleWatch(watched, now)
    return
  }
  const favoriteIds = new Set(favorites.map((team) => team.id))
  const next = mergePlan(watched, result.upcoming, favoriteIds, now)
  await saveWatchedMatches(storage, next)
  await scheduleWatch(next, now)
}

async function watch() {
  if (!(await loadNotificationsEnabled(storage))) {
    await stopWatching()
    return
  }
  const watched = await loadWatchedMatches(storage)
  const statuses = new Map<string, MatchStatus>()
  await Promise.all(
    watchWindow(watched, new Date()).due.map(async (entry) => {
      try {
        const fresh = await getMatchDetails(toMatch(entry))
        const event = statusEvent(entry.status, fresh.status)
        if (event) {
          await chrome.notifications.create(notificationId(entry.id, event), {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/notification-128.png'),
            ...notificationContent(fresh, event),
          })
        }
        statuses.set(entry.id, fresh.status)
      } catch (error) {
        // Keep the stored status; the next tick tries again. Other matches still update.
        if (!(error instanceof MatchDetailsError)) {
          console.error('Unexpected error while checking match', entry.id, error)
        }
      }
    }),
  )
  const next = watched.map((entry) => ({ ...entry, status: statuses.get(entry.id) ?? entry.status }))
  await saveWatchedMatches(storage, next)
  await scheduleWatch(next, new Date())
}

function start() {
  chrome.alarms.create(PLAN_ALARM, { periodInMinutes: 60 })
  enqueue(plan)
}

chrome.runtime.onInstalled.addListener(start)
chrome.runtime.onStartup.addListener(start)

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PLAN_ALARM) enqueue(plan)
  else if (alarm.name === WATCH_ALARM) enqueue(watch)
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (FAVORITE_TEAMS_KEY in changes || NOTIFICATIONS_ENABLED_KEY in changes)) {
    enqueue(plan)
  }
})
