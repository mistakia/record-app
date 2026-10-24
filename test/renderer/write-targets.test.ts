// Write targets (spec §8.6.3): which libraries a write may go to, the
// capability chosen for a shared one without asking, and the default; and
// where a label goes and where it can be removed from.

import { describe, expect, test } from 'bun:test'

import type { Capability, Library } from '#renderer/api/types.ts'
import { describe_holders } from '#renderer/components/library/library-category.ts'
import { removable_from } from '#renderer/components/track/remove-dialog.tsx'
import { choose_capability, default_target, label_targets, label_write_target, removal_target, resolve_target, target_fields, write_targets } from '#renderer/library/write-targets.ts'

const library = (overrides: Partial<Library>): Library => ({
  id: overrides.address ?? 'x',
  address: '/record/z/x',
  library_type: 'recordstore',
  track_count: 0,
  audio_size_bytes: 0,
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
  library({ address: '/record/z/labels', is_own: true, library_type: 'labels' }),
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
    // The capability does not grant labelling.
    expect(write_targets({ libraries: LIBRARIES, held, action: 'library.write_label' }).map(({ library_address }) => library_address)).toEqual(['/record/z/own', '/record/z/own2'])
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

describe('holders', () => {
  test('describes which libraries hold a track, by category (spec 8.6.7)', () => {
    expect(describe_holders({ addresses: ['/record/z/own', '/record/z/own2', '/record/z/shared', '/record/z/linked', '/record/z/unknown'], libraries: LIBRARIES }))
      .toBe('2 of yours, 1 shared with you, 1 followed, 1 discovered')
    expect(describe_holders({ addresses: [], libraries: LIBRARIES })).toBeNull()
    // Not before the library list loads, when every holder would read as discovered.
    expect(describe_holders({ addresses: ['/record/z/own'], libraries: undefined })).toBeNull()
  })

  test('a track can be removed only from own active recordstores holding it', () => {
    const track = { library_addresses: ['/record/z/own2', '/record/z/retired', '/record/z/listens', '/record/z/shared'] } as unknown as Parameters<typeof removable_from>[0]['track']
    expect(removable_from({ track, libraries: LIBRARIES }).map(({ address }) => address)).toEqual(['/record/z/own2'])
  })
})

describe('label targets', () => {
  const OWN = LIBRARIES.filter(({ is_own }) => is_own)
  const labelling = capability({ capability_id: 'labels', actions: ['library.write_label'] })
  const prefixed = capability({ capability_id: 'mix', actions: ['library.write_label'], filter: { type: 'prefix', field: 'label', prefix: 'mix/' } as unknown as Capability['filter'] })

  test('a label goes to the labels library, and in a co-managed library may go to it instead', () => {
    const just_me = { library_address: '/record/z/labels', category: 'own' as const, capability_id: null }
    expect(label_targets({ own: OWN, libraries: LIBRARIES, held: [], viewed: '', co_managed: false })).toEqual({ just_me, shared: null })
    // An own recordstore offers shared only once it has let someone write.
    expect(label_targets({ own: OWN, libraries: LIBRARIES, held: [], viewed: '/record/z/own', co_managed: false }).shared).toBeNull()
    expect(label_targets({ own: OWN, libraries: LIBRARIES, held: [], viewed: '/record/z/own', co_managed: true }).shared).toEqual({ library_address: '/record/z/own', category: 'own', capability_id: null })
    // Another identity's library, through a capability granting write_label.
    expect(label_targets({ own: OWN, libraries: LIBRARIES, held: [capability({})], viewed: '/record/z/shared', co_managed: false }).shared).toBeNull()
    expect(label_targets({ own: OWN, libraries: LIBRARIES, held: [labelling], viewed: '/record/z/shared', co_managed: false }).shared).toEqual({ library_address: '/record/z/shared', category: 'shared', capability_id: 'labels' })
    expect(label_targets({ own: OWN, libraries: LIBRARIES, held: [labelling], viewed: '/record/z/linked', co_managed: false }).shared).toBeNull()
    // No labels library (a node that has not made one yet): nowhere to label.
    expect(label_targets({ own: [], libraries: LIBRARIES, held: [], viewed: '', co_managed: false }).just_me).toBeNull()
  })

  test('a shared label write cites a capability whose prefix admits the label', () => {
    const target = { library_address: '/record/z/shared', category: 'shared' as const, capability_id: 'mix' }
    const subject = (label: string) => ({ type: 'label' as const, track_id: 'a'.repeat(64), label, op: 'set' as const })
    expect(label_write_target({ target, held: [prefixed], subject: subject('mix/late') })?.capability_id).toBe('mix')
    expect(label_write_target({ target, held: [prefixed], subject: subject('dub') })).toBeNull()
    expect(label_write_target({ target, held: [prefixed, labelling], subject: subject('dub') })?.capability_id).toBe('labels')
    const own = { library_address: '/record/z/labels', category: 'own' as const, capability_id: null }
    expect(label_write_target({ target: own, held: [], subject: subject('dub') })).toBe(own)
  })

  test('a label is removable where the write is authorised, never a node-managed one', () => {
    const removal = (library_address: string, tag: string, held: Capability[] = [], managed: ReadonlySet<string> = new Set()) =>
      removal_target({ library_address, tag, track_id: 'a'.repeat(64), libraries: LIBRARIES, own: OWN, held, managed })
    expect(removal('/record/z/labels', 'dub')?.library_address).toBe('/record/z/labels')
    expect(removal('/record/z/own', 'dub')?.capability_id).toBeNull()
    expect(removal('/record/z/retired', 'dub')).toBeNull()
    expect(removal('/record/z/linked', 'dub')).toBeNull()
    expect(removal('/record/z/shared', 'dub')).toBeNull()
    expect(removal('/record/z/shared', 'dub', [labelling])?.capability_id).toBe('labels')
    expect(removal('/record/z/shared', 'mix/late', [prefixed])?.capability_id).toBe('mix')
    expect(removal('/record/z/shared', 'dub', [prefixed])).toBeNull()
    // A managed label is read-only outside the labels library.
    expect(removal('/record/z/own', 'genre/dub', [], new Set(['genre/dub']))).toBeNull()
    expect(removal('/record/z/labels', 'genre/dub', [], new Set(['genre/dub']))?.library_address).toBe('/record/z/labels')
  })
})
