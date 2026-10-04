import { useEffect, useState } from 'react'

/** The current time, updated every `intervalMs` (or never when null). */
export function useNow(intervalMs: number | null): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (intervalMs === null) return
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
