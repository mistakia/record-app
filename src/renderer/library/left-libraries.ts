// Shared libraries the user has left (spec §8.6.4): the app stops offering
// writes against them. Leaving revokes nothing, and the user can rejoin.
// Kept per node in local storage, since it is this app's choice, not
// node state (§8.8.4 Layer C).

import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
const storage_key = (node_key: string): string => `record:left-libraries:${node_key}`
const cache = new Map<string, readonly string[]>()
const EMPTY: readonly string[] = Object.freeze([])

const read = (node_key: string | null): readonly string[] => {
  if (node_key === null) return EMPTY
  const cached = cache.get(node_key)
  if (cached !== undefined) return cached
  let value: readonly string[] = EMPTY
  try {
    const parsed = JSON.parse(localStorage.getItem(storage_key(node_key)) ?? '[]') as unknown
    if (Array.isArray(parsed)) value = Object.freeze(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {}
  cache.set(node_key, value)
  return value
}

export const set_left = ({ node_key, library_address, left }: { node_key: string | null, library_address: string, left: boolean }): void => {
  if (node_key === null) return
  const current = read(node_key)
  const next = Object.freeze(left ? [...new Set([...current, library_address])] : current.filter((address) => address !== library_address))
  cache.set(node_key, next)
  localStorage.setItem(storage_key(node_key), JSON.stringify(next))
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const use_left_libraries = (node_key: string | null): readonly string[] =>
  useSyncExternalStore(subscribe, () => read(node_key))
