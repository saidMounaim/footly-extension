import { COMPETITIONS, getMatchDetails, getMatchList, MatchDetailsError } from './api/football.ts'
import type { MatchStatus } from './api/types.ts'
import { loadMatchListSnapshot, matchListFreshness, saveMatchListSnapshot } from './lib/cache.ts'
import {
  FAVORITE_TEAMS_KEY,
  FavoritesStorageError,
  loadFavoriteTeams,
  type StorageArea,
} from './lib/favorites.ts'
import {
  NOTIFICATIONS_ENABLED_KEY,
  eventAlerts,
  eventNotificationContent,
  eventNotificationId,
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
const ICON_PATH = 'icons/notification-128.png'

function notify(id: string, content: { title: string; message: string }) {
  return chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL(ICON_PATH),
    ...content,
  })
}

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

function reportUnexpectedCacheError(error: unknown) {
  if (!(error instanceof FavoritesStorageError)) {
    console.error('Unexpected error while accessing the match cache', error)
  }
}

/** The fresh saved match list when there is one, otherwise a fetched list that is then saved. */
async function currentMatchList() {
  try {
    const snapshot = await loadMatchListSnapshot(storage)
    if (snapshot && matchListFreshness(snapshot, new Date()) === 'fresh') return snapshot.result
  } catch (error) {
    reportUnexpectedCacheError(error)
  }
  const result = await getMatchList()
  await saveMatchListSnapshot(storage, result, new Date()).catch(reportUnexpectedCacheError)
  return result
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
  const [result, watched] = await Promise.all([currentMatchList(), loadWatchedMatches(storage)])
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
  const updates = new Map<string, { status: MatchStatus; seenEventIds: string[] }>()
  await Promise.all(
    watchWindow(watched, new Date()).due.map(async (entry) => {
      try {
        const fresh = await getMatchDetails(toMatch(entry))
        const event = statusEvent(entry.status, fresh.status)
        if (event) await notify(notificationId(entry.id, event), notificationContent(fresh, event))
        const { alerts, seenEventIds } = eventAlerts(entry, fresh)
        for (const alert of alerts) {
          await notify(eventNotificationId(entry.id, alert.id), eventNotificationContent(fresh, alert))
        }
        updates.set(entry.id, { status: fresh.status, seenEventIds })
      } catch (error) {
        // Keep the stored status; the next tick tries again. Other matches still update.
        if (!(error instanceof MatchDetailsError)) {
          console.error('Unexpected error while checking match', entry.id, error)
        }
      }
    }),
  )
  const next = watched.map((entry) => ({ ...entry, ...updates.get(entry.id) }))
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
