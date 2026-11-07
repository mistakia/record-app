// The Tags page's node calls, beside the main API since they serve one
// page: each label library's own label counts, and the relabel job's
// POST /tags/batch and track page read for collection. The job's two calls
// never touch the cache. A batch invalidates nothing, since its
// library:labels-changed event refreshes the views through the event
// batcher; the read is a mutation so no page of a set the job is shrinking
// stays cached. Dispatch both with { track: false }.

import type { TagCount, TrackList } from '#renderer/api/types.ts'
import type { NodeFailure } from '#shared/bridge.ts'
import { node_api } from './api.ts'
import type { LabelBatch } from './relabel-batches.ts'
import type { CollectPageArgs, LabelBatchResult } from './relabel-run.ts'

export const label_batch_api = node_api.injectEndpoints({
  endpoints: (build) => ({
    // Each library's labels counted alone (GET /tags with label_libraries
    // [it] and no membership scope), by address: what a change there
    // touches, and whether the node manages it (any row managed).
    get_label_library_counts: build.query<Record<string, TagCount[]>, string[]>({
      queryFn: async (addresses, _api, _options, base_query) => {
        const counts: Record<string, TagCount[]> = {}
        for (const address of addresses) {
          const result = await base_query({ method: 'get', path_template: '/tags', query: { label_libraries: [address] } })
          if (result.error !== undefined) return { error: result.error as NodeFailure }
          counts[address] = result.data as TagCount[]
        }
        return { data: counts }
      },
      providesTags: ['tags']
    }),
    change_labels_batch: build.mutation<{ results: LabelBatchResult[] }, LabelBatch>({
      query: ({ library_address, capability_id, items }) => ({
        method: 'post',
        path_template: '/tags/batch',
        body: { items, library_address, ...(capability_id === null ? {} : { capability_id }) }
      })
    }),
    collect_track_page: build.mutation<TrackList, CollectPageArgs>({
      query: (args) => ({ method: 'get', path_template: '/tracks', query: { ...args } })
    })
  })
})
