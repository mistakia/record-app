// An image blob by CID as a data: URL; null while it loads, when the CID is
// empty, or when the node has no image for it.

import { useEffect, useSyncExternalStore } from 'react'

import { cached_image, load_image, subscribe_images } from '#renderer/images/image-cache.ts'

export const use_image = (cid: string | null | undefined): string | null => {
  const url = useSyncExternalStore(subscribe_images, () => cid === null || cid === undefined ? null : cached_image(cid) ?? null)
  useEffect(() => {
    if (cid !== null && cid !== undefined && cached_image(cid) === undefined) load_image(cid).catch(() => {})
  }, [cid])
  return url
}
