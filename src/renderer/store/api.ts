// Server data lives only in the RTK Query cache. The base query calls the
// preload bridge, so every request leaves from the main process.

import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react'

import type { NodeFailure, NodeRequest } from '#shared/bridge.ts'
import type { Library, Settings, TrackList } from '#renderer/api/types.ts'

const node_base_query: BaseQueryFn<NodeRequest, unknown, NodeFailure> = async (request) => {
  const result = await window.record.request(request)
  return result.ok ? { data: result.data } : { error: result.failure }
}

export interface GetTracksArgs {
  offset: number
  limit: number
  library_addresses?: string[]
}

export const node_api = createApi({
  reducerPath: 'node_api',
  baseQuery: node_base_query,
  tagTypes: ['settings', 'libraries', 'tracks'],
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
