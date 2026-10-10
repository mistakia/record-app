// The app's own view choices — dismissed help banners, folded sections,
// hidden columns — kept in local storage across launches: application
// state, not node state (spec §8.8.4 Layer C), and the same on every node.

import { useCallback, useSyncExternalStore } from 'react'

const PREFIX = 'record:view:'
const listeners = new Set<() => void>()
const cache = new Map<string, unknown>()

export const read_view_pref = <T>(key: string, fallback: T): T => {
  if (cache.has(key)) return cache.get(key) as T
  let value: T = fallback
  try {
    const stored = localStorage.getItem(PREFIX + key)
    if (stored !== null) value = JSON.parse(stored) as T
  } catch {}
  cache.set(key, value)
  return value
}

export const write_view_pref = (key: string, value: unknown): void => {
  cache.set(key, value)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {}
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// The fallback must be stable (a literal or a module constant), since it is
// returned as is until a value is stored.
export const use_view_pref = <T>(key: string, fallback: T): [T, (value: T) => void] => {
  const value = useSyncExternalStore(subscribe, () => read_view_pref(key, fallback))
  const set = useCallback((next: T) => { write_view_pref(key, next) }, [key])
  return [value, set]
}
