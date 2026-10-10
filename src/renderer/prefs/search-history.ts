// Recent searches (STYLE.md § Track list): the search text the user acted
// on or left the field with, newest first, case-insensitively unique, at
// most 20. One list for every track view, kept on this machine only as a
// view pref; tag filters are not part of it.

import { read_view_pref, use_view_pref, write_view_pref } from './view-prefs.ts'

const KEY = 'search-history'
export const SEARCH_HISTORY_LIMIT = 20
const NONE: readonly string[] = []

export const with_search_recorded = (history: readonly string[], query: string): readonly string[] => {
  const text = query.trim()
  if (text === '') return history
  const folded = text.toLowerCase()
  return [text, ...history.filter((entry) => entry.toLowerCase() !== folded)].slice(0, SEARCH_HISTORY_LIMIT)
}

export const with_search_removed = (history: readonly string[], query: string): readonly string[] =>
  history.filter((entry) => entry !== query)

// Stored text that is not a list of strings reads as no history.
export const as_search_history = (value: unknown): readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : NONE

const read = (): readonly string[] => as_search_history(read_view_pref<unknown>(KEY, NONE))

const same = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((entry, index) => entry === b[index])

// A no-op when the list would not change, so a caller may record on every
// render of something without waking the subscribers.
const store = (next: readonly string[]): void => {
  if (!same(next, read())) write_view_pref(KEY, next)
}

export const record_search = (query: string): void => { store(with_search_recorded(read(), query)) }
export const remove_search = (query: string): void => { store(with_search_removed(read(), query)) }
export const clear_searches = (): void => { store(NONE) }

export const use_search_history = (): readonly string[] => as_search_history(use_view_pref<unknown>(KEY, NONE)[0])
