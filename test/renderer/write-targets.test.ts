// Write targets (spec §8.6.3): which libraries a write may go to, the
// capability chosen for a shared one without asking, and the default.

import { describe, expect, test } from 'bun:test'

import type { Capability, Library } from '#renderer/api/types.ts'
import { choose_capability, default_target, resolve_target, target_fields, write_targets } from '#renderer/library/write-targets.ts'

const library = (overrides: Partial<Library>): Library => ({
  id: overrides.address ?? 'x',
  address: '/record/z/x',
  library_type: 'recordstore',
  track_count: 0,
  linked_library_count: 0,
  length: 0,
  heads: [],
  replication_status: { progress: 0, total: 0 },
  is_replicating: false,
  connected: true,
  is_loading_index: false,
  is_processing_index: false,
  is_linked: false,
  is_own: false,
  is_retired: false,
  held_capability_ids: [],
  peer_ids: [],
  ...overrides
})

const capability = (overrides: Partial<Capability>): Capability => ({
  capability_id: 'cap',
  library_address: '/record/z/shared',
  issuer: '02aa',
  grantee: { type: 'key', key: '02bb' } as unknown as Capability['grantee'],
  actions: ['library.append_track'],
  filter: null,
  conditions: [],
  issued_at_ms: 1,
  status: 'active',
  ...overrides
})

const LIBRARIES = [
  library({ address: '/record/z/own', is_own: true }),
  library({ address: '/record/z/own2', is_own: true }),
  library({ address: '/record/z/retired', is_own: true, is_retired: true }),
  library({ address: '/record/z/listens', is_own: true, library_type: 'listens' }),
  library({ address: '/record/z/linked', is_linked: true }),
  library({ address: '/record/z/shared', is_linked: true, held_capability_ids: ['cap'] })
]

describe('write targets', () => {
  test('own active recordstores, and a shared library only for a held active capability with the action', () => {
    const held = [capability({})]
    expect(write_targets({ libraries: LIBRARIES, held, action: 'library.append_track' })).toEqual([
      { library_address: '/record/z/own', category: 'own', capability_id: null },
      { library_address: '/record/z/own2', category: 'own', capability_id: null },
      { library_address: '/record/z/shared', category: 'shared', capability_id: 'cap' }
    ])
    // The capability does not grant tagging.
    expect(write_targets({ libraries: LIBRARIES, held, action: 'library.append_tag' }).map(({ library_address }) => library_address)).toEqual(['/record/z/own', '/record/z/own2'])
    for (const status of ['expired', 'revoked', 'inert'] as const) {
      expect(write_targets({ libraries: LIBRARIES, held: [capability({ status })], action: 'library.append_track' })).toHaveLength(2)
    }
  })

  test('picks an unfiltered capability over a filtered one, then the one that expires last, and ignores unknown verbs', () => {
    const held = [
      capability({ capability_id: 'filtered', filter: { type: 'eq' } as unknown as Capability['filter'] }),
      capability({ capability_id: 'soon', expires_at_ms: 10 }),
      capability({ capability_id: 'later', expires_at_ms: 20 }),
      capability({ capability_id: 'other-library', library_address: '/record/z/elsewhere' }),
      capability({ capability_id: 'unknown-verb', actions: ['library.future_verb'] })
    ]
    expect(choose_capability({ held, library_address: '/record/z/shared', action: 'library.append_track', now: 0 })?.capability_id).toBe('later')
    expect(choose_capability({ held: [...held, capability({ capability_id: 'forever' })], library_address: '/record/z/shared', action: 'library.append_track', now: 0 })?.capability_id).toBe('forever')
    expect(choose_capability({ held: [held[0] as Capability], library_address: '/record/z/shared', action: 'library.append_track', now: 0 })?.capability_id).toBe('filtered')
  })

  test('an expiry passed since the list was fetched rules a capability out', () => {
    const held = [capability({ capability_id: 'lapsed', expires_at_ms: 1_000 })]
    expect(choose_capability({ held, library_address: '/record/z/shared', action: 'library.append_track', now: 999 })?.capability_id).toBe('lapsed')
    expect(choose_capability({ held, library_address: '/record/z/shared', action: 'library.append_track', now: 1_000 })).toBeNull()
  })

  test('resolves nothing while loading or when the chosen library is no longer a target, never a silent fallback', () => {
    const targets = write_targets({ libraries: LIBRARIES, held: [capability({})], action: 'library.append_track' })
    expect(resolve_target({ targets, chosen: null, recent: null, loading: true })).toEqual({ kind: 'loading' })
    expect(resolve_target({ targets, chosen: '/record/z/gone', recent: null, loading: false })).toEqual({ kind: 'chosen_gone', library_address: '/record/z/gone' })
    expect(resolve_target({ targets, chosen: '/record/z/shared', recent: null, loading: false })).toMatchObject({ kind: 'target', target: { capability_id: 'cap' } })
    expect(resolve_target({ targets: [], chosen: null, recent: null, loading: false })).toEqual({ kind: 'none' })
  })

  test('defaults to the preferred library, then the last used, then the first own one', () => {
    const targets = write_targets({ libraries: LIBRARIES, held: [capability({})], action: 'library.append_track' })
    expect(default_target({ targets, recent: null })?.library_address).toBe('/record/z/own')
    expect(default_target({ targets, recent: '/record/z/own2' })?.library_address).toBe('/record/z/own2')
    expect(default_target({ targets, recent: '/record/z/own2', preferred: '/record/z/shared' })?.library_address).toBe('/record/z/shared')
    // A preferred library that is not writable falls through.
    expect(default_target({ targets, recent: '/record/z/gone', preferred: '/record/z/linked' })?.library_address).toBe('/record/z/own')
    expect(default_target({ targets: [], recent: null })).toBeNull()
  })

  test('sends the capability only for a shared target', () => {
    expect(target_fields({ library_address: '/a', category: 'own', capability_id: null })).toEqual({ library_address: '/a' })
    expect(target_fields({ library_address: '/b', category: 'shared', capability_id: 'cap' })).toEqual({ library_address: '/b', capability_id: 'cap' })
  })
})
