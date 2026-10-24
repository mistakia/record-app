// Where a label shown on a track can be removed from (removal_target, spec
// §8.6.3), bound to the node's lists: the library list, the own libraries,
// the capabilities held, and which labels a node-managed library holds
// (TagCount.managed, over every library). Stable while those are, so
// memoized rows keep their props.

import { useCallback, useMemo } from 'react'

import { own_libraries_of } from '#renderer/components/library/library-category.ts'
import { removal_target, type WriteTarget } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'

export type LabelRemoval = (input: { library_address: string, tag: string, track_id: string }) => WriteTarget | null

export const use_label_removal = (): LabelRemoval => {
  const libraries = node_api.endpoints.get_libraries.useQuery().data
  const own_data = node_api.endpoints.get_own_libraries.useQuery().data
  const held = node_api.endpoints.get_held_capabilities.useQuery().data
  const tags = node_api.endpoints.get_tags.useQuery({}).data
  const own = useMemo(() => own_libraries_of({ own: own_data, libraries }), [own_data, libraries])
  const managed = useMemo(() => new Set((tags ?? []).filter((count) => count.managed).map(({ tag }) => tag)), [tags])
  return useCallback(({ library_address, tag, track_id }) =>
    removal_target({ library_address, tag, track_id, libraries: libraries ?? [], own, held: held ?? [], managed }), [libraries, own, held, managed])
}
