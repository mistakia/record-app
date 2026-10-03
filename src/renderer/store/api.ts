// Server data lives only in the RTK Query cache. The base query calls the
// preload bridge, so every request leaves from the main process.

import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react'

import type { NodeFailure, NodeRequest } from '#shared/bridge.ts'
import { TRACK_PAGE_SIZE, type About, type Capability, type ReplicationMode, type ReplicationPolicy, type ImportAck, type Library, type Peer, type Settings, type TagCount, type Track, type TrackList } from '#renderer/api/types.ts'
import { select_writes_allowed, type ConnectionState } from './connection.ts'
import { NODE_API_TAGS } from './event-invalidation.ts'
import { library_ids } from './cache-ids.ts'

const READ_METHODS = new Set(['get', 'head'])
const WRITES_WAIT: NodeFailure = { kind: 'refused', message: 'Writes wait until the app has caught up with the node.' }

const node_base_query: BaseQueryFn<NodeRequest, unknown, NodeFailure> = async (request, { getState }) => {
  // Spec §8.8.3: no write against stale state. Every write passes here.
  if (!READ_METHODS.has(request.method) && !select_writes_allowed(getState() as { connection: ConnectionState })) {
    return { error: WRITES_WAIT }
  }
  const result = await window.record.request(request)
  return result.ok ? { data: result.data } : { error: result.failure }
}

export type TrackSort = 'added_at' | 'title' | 'artist' | 'album' | 'bpm' | 'duration'
export type SortOrder = 'asc' | 'desc'

// The track-list choices beyond the library: search text, tags (all must
// match), and sort.
export interface TrackFilters {
  query: string
  tags: string[]
  sort: TrackSort
  order: SortOrder
}

export const DEFAULT_TRACK_FILTERS: TrackFilters = { query: '', tags: [], sort: 'added_at', order: 'desc' }

export interface GetTracksArgs {
  offset: number
  limit: number
  library_addresses?: string[]
  query?: string
  tags?: string[]
  sort?: TrackSort
  order?: SortOrder
}

// The one place track-list query args are built, so the hibernation
// snapshot and the virtual list's pages read the same cache entries. Values
// at their defaults are left out, so equal views share one entry.
export const track_page_args = ({ library_address, page, filters = DEFAULT_TRACK_FILTERS }: {
  library_address: string
  page: number
  filters?: TrackFilters
}): GetTracksArgs => ({
  offset: page * TRACK_PAGE_SIZE,
  limit: TRACK_PAGE_SIZE,
  ...(library_address === '' ? {} : { library_addresses: [library_address] }),
  ...(filters.query.trim() === '' ? {} : { query: filters.query.trim() }),
  ...(filters.tags.length === 0 ? {} : { tags: [...filters.tags].sort() }),
  ...(filters.sort === 'added_at' ? {} : { sort: filters.sort }),
  ...(filters.order === 'desc' ? {} : { order: filters.order })
})

const encode = (address: string) => ({ address })

interface TargetFields { library_address: string, capability_id?: string }

export const node_api = createApi({
  reducerPath: 'node_api',
  baseQuery: node_base_query,
  tagTypes: NODE_API_TAGS,
  // Refetch as soon as a tag is invalidated, so reconcile can wait on it.
  invalidationBehavior: 'immediately',
  endpoints: (build) => ({
    get_settings: build.query<Settings, void>({
      query: () => ({ method: 'get', path_template: '/settings' }),
      providesTags: ['settings']
    }),
    get_libraries: build.query<Library[], void>({
      query: () => ({ method: 'get', path_template: '/libraries' }),
      providesTags: ['libraries']
    }),
    // Every own library, active and retired, the listens library included.
    get_own_libraries: build.query<Library[], void>({
      query: () => ({ method: 'get', path_template: '/identity/libraries' }),
      providesTags: ['libraries', 'own_libraries']
    }),
    // Capabilities other identities granted this one, in every known library.
    get_held_capabilities: build.query<Capability[], void>({
      query: () => ({ method: 'get', path_template: '/identity/capabilities' }),
      providesTags: ['capabilities']
    }),
    // Every capability ever issued in a library, with its status.
    get_library_capabilities: build.query<Capability[], string>({
      query: (address) => ({ method: 'get', path_template: '/libraries/{address}/capabilities', params: encode(address) }),
      providesTags: ['capabilities']
    }),
    // Node-local, per library (§4.6.1); an own library is always full.
    get_replication_policy: build.query<ReplicationPolicy, string>({
      query: (address) => ({ method: 'get', path_template: '/libraries/{address}/replication-policy', params: encode(address) }),
      providesTags: (_result, _error, address) => [{ type: 'replication_policy' as const, id: address }]
    }),
    get_tracks: build.query<TrackList, GetTracksArgs>({
      query: (args) => ({ method: 'get', path_template: '/tracks', query: { ...args } }),
      // Per library, so the head-check refetches only what moved (§8.8.5).
      providesTags: (_result, _error, args) => library_ids(args.library_addresses).map((id) => ({ type: 'tracks' as const, id }))
    }),
    get_tags: build.query<TagCount[], { library_addresses?: string[] }>({
      query: ({ library_addresses }) => ({ method: 'get', path_template: '/tags', query: { library_addresses } }),
      providesTags: (_result, _error, { library_addresses }) => library_ids(library_addresses).map((id) => ({ type: 'tags' as const, id }))
    }),
    get_about: build.query<About, string>({
      query: (address) => ({ method: 'get', path_template: '/libraries/{address}/about', params: encode(address) }),
      providesTags: (_result, _error, address) => [{ type: 'about' as const, id: address }]
    }),
    get_listens: build.query<TrackList, { offset: number, limit: number }>({
      query: ({ offset, limit }) => ({ method: 'get', path_template: '/listens', query: { offset, limit } }),
      providesTags: ['listens']
    }),
    get_peers: build.query<Peer[], void>({
      query: () => ({ method: 'get', path_template: '/peers' }),
      providesTags: ['peers']
    }),
    // The one write of the playback path (spec §8.9.1 listen recording).
    record_listen: build.mutation<unknown, { track_id: string, library_address: string }>({
      query: ({ track_id, library_address }) => ({ method: 'post', path_template: '/listens', body: { track_id, library_address } }),
      invalidatesTags: ['listens']
    }),
    // Every write that appends to a library names its target (chapter 7
    // write targets) and, for a library another identity owns, the
    // capability authorising it.
    add_tag: build.mutation<Track, { track_id: string, tag: string } & TargetFields>({
      query: (body) => ({ method: 'post', path_template: '/tags', body }),
      invalidatesTags: ['tracks', 'tags']
    }),
    // Only an own library: no capability authorises dropping a tag (§3.5.6).
    remove_tag: build.mutation<Track, { track_id: string, tag: string, library_address: string }>({
      query: (query) => ({ method: 'delete', path_template: '/tags', query }),
      invalidatesTags: ['tracks', 'tags']
    }),
    // Pins are identity-library records keyed on the audio CID (§4.6.2),
    // binding on every device of the identity.
    pin_track: build.mutation<unknown, { cid: string, pinned: boolean }>({
      query: ({ cid, pinned }) => ({ method: pinned ? 'post' : 'delete', path_template: '/tracks/{cid}/pin', params: { cid } }),
      invalidatesTags: ['tracks']
    }),
    // Ingest by CID, and adoption of a track from another library (§8.6.7).
    add_track_by_cid: build.mutation<Track, { content_cid: string } & TargetFields>({
      query: (body) => ({ method: 'post', path_template: '/tracks', body }),
      invalidatesTags: ['tracks', 'tags', 'libraries']
    }),
    import_url: build.mutation<ImportAck, { url: string } & TargetFields>({
      query: (body) => ({ method: 'post', path_template: '/import/url', body })
    }),
    link_library: build.mutation<Library, { library_address: string, alias: string | null }>({
      query: ({ library_address, alias }) => ({ method: 'post', path_template: '/libraries', body: { library_address, alias } }),
      invalidatesTags: ['libraries', 'tracks', 'tags']
    }),
    unlink_library: build.mutation<unknown, string>({
      query: (address) => ({ method: 'delete', path_template: '/libraries/{address}', params: encode(address) }),
      invalidatesTags: ['libraries', 'tracks', 'tags']
    }),
    connect_library: build.mutation<unknown, string>({
      query: (address) => ({ method: 'post', path_template: '/libraries/{address}/connect', params: encode(address) }),
      invalidatesTags: ['libraries']
    }),
    disconnect_library: build.mutation<unknown, string>({
      query: (address) => ({ method: 'post', path_template: '/libraries/{address}/disconnect', params: encode(address) }),
      invalidatesTags: ['libraries']
    }),
    set_replication_policy: build.mutation<ReplicationPolicy, { address: string, mode: ReplicationMode, filter?: unknown }>({
      query: ({ address, ...body }) => ({ method: 'put', path_template: '/libraries/{address}/replication-policy', params: encode(address), body }),
      invalidatesTags: ['replication_policy', 'libraries']
    }),
    issue_capability: build.mutation<Capability, { address: string, grantee: unknown, actions: string[], filter?: unknown, conditions?: unknown[] }>({
      query: ({ address, ...body }) => ({ method: 'post', path_template: '/libraries/{address}/capabilities', params: encode(address), body }),
      invalidatesTags: ['capabilities', 'libraries']
    }),
    revoke_capability: build.mutation<unknown, { address: string, capability_id: string }>({
      query: ({ address, capability_id }) => ({ method: 'delete', path_template: '/libraries/{address}/capabilities/{id}', params: { address, id: capability_id } }),
      invalidatesTags: ['capabilities', 'libraries']
    }),
    create_own_library: build.mutation<Library, { discriminator?: string, about?: { name: string } }>({
      query: (body) => ({ method: 'post', path_template: '/identity/libraries', body }),
      invalidatesTags: ['libraries', 'about']
    }),
    retire_own_library: build.mutation<unknown, string>({
      query: (address) => ({ method: 'delete', path_template: '/identity/libraries/{address}', params: encode(address) }),
      invalidatesTags: ['libraries']
    }),
    // The key goes to main's identity channel, not the generic request, so
    // the gate the base query applies is applied here. Dispatch with
    // { track: false } so the key never sits in the mutation cache.
    import_identity: build.mutation<unknown, { private_key: string }>({
      queryFn: async ({ private_key }, { getState }) => {
        if (!select_writes_allowed(getState() as { connection: ConnectionState })) return { error: WRITES_WAIT }
        const result = await window.record.identity.import({ private_key })
        return result.ok ? { data: result.data } : { error: result.failure }
      },
      invalidatesTags: ['libraries', 'tracks', 'tags', 'about', 'listens']
    }),
    update_about: build.mutation<About, { address: string, about: Partial<Omit<About, 'library_address'>> }>({
      query: ({ address, about }) => ({ method: 'post', path_template: '/libraries/{address}/about', params: encode(address), body: about }),
      invalidatesTags: ['about', 'libraries']
    })
  })
})
