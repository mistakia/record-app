// Server data lives only in the RTK Query cache. The base query calls the
// preload bridge, so every request leaves from the main process.

import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react'

import type { NodeFailure, NodeRequest } from '#shared/bridge.ts'
import { TRACK_PAGE_SIZE, type Library, type Settings, type TrackList } from '#renderer/api/types.ts'
import { select_writes_allowed, type ConnectionState } from './connection.ts'
import { NODE_API_TAGS } from './event-invalidation.ts'

const READ_METHODS = new Set(['get', 'head'])

const node_base_query: BaseQueryFn<NodeRequest, unknown, NodeFailure> = async (request, { getState }) => {
  // Spec §8.8.3: no write against stale state. Every write passes here.
  if (!READ_METHODS.has(request.method) && !select_writes_allowed(getState() as { connection: ConnectionState })) {
    return { error: { kind: 'refused', message: 'Writes wait until the app has caught up with the node.' } }
  }
  const result = await window.record.request(request)
  return result.ok ? { data: result.data } : { error: result.failure }
}

export interface GetTracksArgs {
  offset: number
  limit: number
  library_addresses?: string[]
}

// The one place track-list query args are built, so the hibernation
// snapshot seeds exactly the cache entry the track list reads.
export const track_page_args = ({ library_address, page }: { library_address: string, page: number }): GetTracksArgs => ({
  offset: page * TRACK_PAGE_SIZE,
  limit: TRACK_PAGE_SIZE,
  ...(library_address === '' ? {} : { library_addresses: [library_address] })
})

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
    get_tracks: build.query<TrackList, GetTracksArgs>({
      query: ({ offset, limit, library_addresses }) => ({
        method: 'get',
        path_template: '/tracks',
        query: { offset, limit, library_addresses }
      }),
      providesTags: ['tracks']
    })
  })
})
