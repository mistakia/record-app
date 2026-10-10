import { describe, expect, test } from 'bun:test'

import { create_tag_writes, shown_tags, type ShownTag, type TaggedTrack } from '#renderer/components/track/tag-writes.ts'
import type { WriteOutcome } from '#renderer/store/write.ts'
import type { WriteTarget } from '#renderer/library/write-targets.ts'

const OWN = '/record/own/a'
const target: WriteTarget = { library_address: OWN, category: 'own', capability_id: null }

// A node that holds tags per track and refuses what it is told to.
const fake_node = (tracks: TaggedTrack[], { refuse = new Set<string>() }: { refuse?: Set<string> } = {}) => {
  const held = new Map(tracks.map((track) => [track.id, [...track.tags]]))
  const calls: string[] = []
  const answer = (id: string): WriteOutcome<TaggedTrack> => ({ ok: true, data: { id, tags: [...(held.get(id) ?? [])] } })
  return {
    calls,
    add_tag: async ({ track_id, tag }: { track_id: string, tag: string, target: WriteTarget }) => {
      calls.push(`add ${track_id} ${tag}`)
      const tags = held.get(track_id) ?? []
      if (refuse.has(tag) || tags.some((each) => each.tag === tag)) return { ok: false } as const
      tags.push({ tag, library_address: OWN })
      return answer(track_id)
    },
    remove_tag: async ({ track_id, tag }: { track_id: string } & ShownTag) => {
      calls.push(`remove ${track_id} ${tag}`)
      const tags = held.get(track_id) ?? []
      if (refuse.has(tag) || !tags.some((each) => each.tag === tag)) return { ok: false } as const
      held.set(track_id, tags.filter((each) => each.tag !== tag))
      return answer(track_id)
    }
  }
}

const setup = (tracks: TaggedTrack[], options?: { refuse?: Set<string> }) => {
  const node = fake_node(tracks, options)
  const notes: string[] = []
  const writes = create_tag_writes({ initial: tracks, add_tag: node.add_tag, remove_tag: node.remove_tag, notify: (message) => { notes.push(message) } })
  const chips = () => shown_tags(writes.get()).map(({ tag, pending }) => pending ? `${tag}…` : tag)
  return { node, notes, writes, chips }
}

describe('tag writes', () => {
  test('an add shows at once, settles when the node answers, and rolls back when it refuses', async () => {
    const { writes, chips } = setup([{ id: 't1', tags: [] }], { refuse: new Set(['nope']) })
    const done = writes.add('dub', target)
    expect(chips()).toEqual(['dub…'])
    expect(await done).toBe(true)
    expect(chips()).toEqual(['dub'])
    const refused = writes.add('nope', target)
    expect(chips()).toEqual(['dub', 'nope…'])
    expect(await refused).toBe(false)
    expect(chips()).toEqual(['dub'])
    expect(writes.get().fresh.has(`${OWN} nope`)).toBe(false)
  })

  test('a removal hides the chip at once and brings it back when the node refuses', async () => {
    const { writes, chips } = setup([{ id: 't1', tags: [{ tag: 'dub', library_address: OWN }, { tag: 'keep', library_address: OWN }] }], { refuse: new Set(['keep']) })
    const removed = writes.remove({ tag: 'dub', library_address: OWN })
    expect(chips()).toEqual(['keep'])
    await removed
    expect(chips()).toEqual(['keep'])
    const refused = writes.remove({ tag: 'keep', library_address: OWN })
    expect(chips()).toEqual([])
    await refused
    expect(chips()).toEqual(['keep'])
  })

  test('a tag removed and added again is written again', async () => {
    const { node, writes, chips } = setup([{ id: 't1', tags: [{ tag: 'dub', library_address: OWN }] }])
    await writes.remove({ tag: 'dub', library_address: OWN })
    expect(await writes.add('dub', target)).toBe(true)
    expect(node.calls).toEqual(['remove t1 dub', 'add t1 dub'])
    expect(chips()).toEqual(['dub'])
  })

  test('a removal forwards only the tag fields, never a chip\'s display state', async () => {
    // The adder's chips are `{ tag, library_address, pending }` (tag-writes
    // ShownEntry); a removal must not spread that whole object, or the node
    // would refuse the undeclared `pending` query parameter.
    const received: Array<{ [key: string]: unknown }> = []
    const writes = create_tag_writes<TaggedTrack>({
      initial: [{ id: 't1', tags: [{ tag: 'dub', library_address: OWN }] }],
      add_tag: async () => ({ ok: false }),
      remove_tag: async (input) => {
        received.push({ ...input })
        return { ok: true, data: { id: 't1', tags: [] } } as const
      },
      notify: () => {}
    })
    // A `ShownEntry` from shown_tags passes the typed `remove` check, since
    // it adds fields to `ShownTag`; only the engine strips them.
    const chip: { tag: string, library_address: string, pending: boolean } = { tag: 'dub', library_address: OWN, pending: true }
    await writes.remove(chip)
    expect(received).toEqual([{ track_id: 't1', tag: 'dub', library_address: OWN }])
  })

  test('a second removal of the same tag, or one of a tag already gone, sends nothing more', async () => {
    const { node, writes } = setup([{ id: 't1', tags: [{ tag: 'dub', library_address: OWN }] }], { refuse: new Set(['gone']) })
    await Promise.all([writes.remove({ tag: 'dub', library_address: OWN }), writes.remove({ tag: 'dub', library_address: OWN })])
    await writes.add('gone', target)
    await writes.remove({ tag: 'gone', library_address: OWN })
    expect(node.calls).toEqual(['remove t1 dub', 'add t1 gone'])
  })

  test('tagging several tracks skips the ones already tagged and counts only the writes', async () => {
    const { node, writes, notes, chips } = setup([
      { id: 't1', tags: [{ tag: 'dub', library_address: OWN }] },
      { id: 't2', tags: [] },
      { id: 't3', tags: [] }
    ])
    expect(await writes.add('dub', target)).toBe(true)
    expect(node.calls).toEqual(['add t2 dub', 'add t3 dub'])
    expect(notes).toEqual(['Tagged 2 tracks dub. 1 already tagged.'])
    expect(chips()).toEqual(['dub'])
    const again = setup([{ id: 't1', tags: [{ tag: 'dub', library_address: OWN }] }, { id: 't2', tags: [{ tag: 'dub', library_address: OWN }] }])
    expect(await again.writes.add('dub', target)).toBe(true)
    expect(again.node.calls).toEqual([])
    expect(again.notes).toEqual(['2 tracks already tagged dub.'])
  })
})
