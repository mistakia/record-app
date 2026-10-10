// The inline adder's writes, free of React so tests drive them. An add or a
// removal shows at once (optimistic) and is undone if the node refuses it,
// the write itself having said why. Writes run one at a time in the order
// made, each against the tracks as the node last answered, so a tag a track
// already carries is not added again and one it no longer carries is not
// removed again.

import type { WriteOutcome } from '#renderer/store/write.ts'
import type { WriteTarget } from '#renderer/library/write-targets.ts'

export interface ShownTag {
  tag: string
  library_address: string
}

export interface TaggedTrack {
  id: string
  tags: readonly ShownTag[]
}

export const tag_key = ({ tag, library_address }: ShownTag): string => `${library_address} ${tag}`

export interface TagWritesState<T extends TaggedTrack> {
  tracks: readonly T[]
  // Writes made but not yet answered.
  adding: readonly ShownTag[]
  removing: readonly ShownTag[]
  // Tagging several tracks: the tags added here, since their rows are not shown.
  added: readonly ShownTag[]
  // Tags just added, flashing.
  fresh: ReadonlySet<string>
}

export type ShownEntry = ShownTag & { pending: boolean }

// The chips: what the node holds, less removals under way, plus adds under way.
export const shown_tags = <T extends TaggedTrack>(state: TagWritesState<T>): ShownEntry[] => {
  const single = state.tracks.length === 1 ? state.tracks[0] : undefined
  const settled = single === undefined ? state.added : single.tags
  const removing = new Set(state.removing.map(tag_key))
  const held = new Set(settled.map(tag_key))
  return [
    ...settled.map(({ tag, library_address }) => ({ tag, library_address, pending: false })),
    ...state.adding.filter((entry) => !held.has(tag_key(entry))).map((entry) => ({ ...entry, pending: true }))
  ].filter((entry) => !removing.has(tag_key(entry)))
}

export const create_tag_writes = <T extends TaggedTrack>({ initial, add_tag, remove_tag, notify }: {
  initial: readonly T[]
  add_tag: (input: { track_id: string, tag: string, target: WriteTarget }) => Promise<WriteOutcome<T>>
  remove_tag: (input: { track_id: string } & ShownTag) => Promise<WriteOutcome<T>>
  notify: (message: string) => void
}) => {
  let state: TagWritesState<T> = { tracks: initial, adding: [], removing: [], added: [], fresh: new Set() }
  const listeners = new Set<() => void>()
  let queue: Promise<void> = Promise.resolve()

  const set = (next: Partial<TagWritesState<T>>) => {
    state = { ...state, ...next }
    for (const listener of listeners) listener()
  }
  const without = (list: readonly ShownTag[], key: string) => list.filter((each) => tag_key(each) !== key)
  const replace = (track: T) => { set({ tracks: state.tracks.map((each) => each.id === track.id ? track : each) }) }
  const carries = (track_id: string, key: string) => state.tracks.find(({ id }) => id === track_id)?.tags.some((each) => tag_key(each) === key) ?? false
  const enqueue = <R>(job: () => Promise<R>): Promise<R> => {
    const run = queue.then(job)
    queue = run.then(() => {}, () => {})
    return run
  }
  const unfresh = (key: string) => {
    if (!state.fresh.has(key)) return
    const fresh = new Set(state.fresh)
    fresh.delete(key)
    set({ fresh })
  }

  // Resolves true when the tag is on at least one track afterwards.
  const add = (tag: string, target: WriteTarget): Promise<boolean> => {
    const entry = { tag, library_address: target.library_address }
    const key = tag_key(entry)
    if (shown_tags(state).some((each) => tag_key(each) === key)) return Promise.resolve(false)
    set({ adding: [...state.adding, entry], fresh: new Set(state.fresh).add(key) })
    return enqueue(async () => {
      let wrote = 0
      let had = 0
      for (const { id } of state.tracks) {
        if (carries(id, key)) {
          had++
          continue
        }
        const result = await add_tag({ track_id: id, tag, target })
        if (result.ok) {
          wrote++
          replace(result.data)
        }
      }
      const several = state.tracks.length > 1
      const took = wrote + had > 0
      set({ adding: without(state.adding, key), added: several && took ? [...state.added, entry] : state.added })
      if (!took) unfresh(key)
      if (several && took) {
        notify(wrote === 0
          ? `${had} tracks already tagged ${tag}.`
          : `Tagged ${wrote} tracks ${tag}.${had > 0 ? ` ${had} already tagged.` : ''}`)
      }
      return took
    })
  }

  // Only with one track: chips are not removable when tagging several.
  const remove = (entry: ShownTag): Promise<void> => {
    const track = state.tracks.length === 1 ? state.tracks[0] : undefined
    const key = tag_key(entry)
    if (track === undefined || state.removing.some((each) => tag_key(each) === key)) return Promise.resolve()
    set({ removing: [...state.removing, entry] })
    return enqueue(async () => {
      if (carries(track.id, key)) {
        // The tag fields only: an entry from the UI may carry display state
        // (a chip's `pending` flag), which the node's validator would refuse
        // as a query parameter it does not declare.
        const result = await remove_tag({ track_id: track.id, tag: entry.tag, library_address: entry.library_address })
        if (result.ok) replace(result.data)
      }
      set({ removing: without(state.removing, key) })
    })
  }

  return {
    get: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    add,
    remove,
    unfresh
  }
}
