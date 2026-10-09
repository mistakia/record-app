// Artwork and avatars by CID, fetched once through main (GET /images/{cid})
// and kept as data: URLs, the one image source the renderer's CSP allows
// besides its own files. A CID never changes its bytes, so an entry never
// goes stale; the cache is bounded, and a CID the node cannot serve is
// remembered for a while so a list of artless tracks asks once.

const MAX_ENTRIES = 300
const MISS_RETRY_MS = 5 * 60_000

type Entry = { url: string } | { missing_until: number }

const entries = new Map<string, Entry>()
const in_flight = new Map<string, Promise<string | null>>()
const listeners = new Set<() => void>()

const remember = (cid: string, entry: Entry): void => {
  entries.delete(cid)
  entries.set(cid, entry)
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value
    if (oldest === undefined) break
    entries.delete(oldest)
  }
  for (const listener of listeners) listener()
}

const to_data_url = async ({ data, mime }: { data: ArrayBuffer, mime: string }): Promise<string> =>
  await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => { resolve(String(reader.result)) }
    reader.onerror = () => { reject(reader.error ?? new Error('unreadable image')) }
    reader.readAsDataURL(new Blob([data], { type: mime }))
  })

// The cached URL, or undefined while it is unknown; null when the node has
// no image for the CID.
export const cached_image = (cid: string, now = Date.now()): string | null | undefined => {
  const entry = entries.get(cid)
  if (entry === undefined) return undefined
  if ('url' in entry) return entry.url
  return entry.missing_until > now ? null : undefined
}

export const load_image = async (cid: string): Promise<string | null> => {
  const known = cached_image(cid)
  if (known !== undefined) return known
  const pending = in_flight.get(cid)
  if (pending !== undefined) return await pending
  const loading = (async () => {
    try {
      const result = await window.record.get_image({ cid })
      if (!result.ok) {
        remember(cid, { missing_until: Date.now() + MISS_RETRY_MS })
        return null
      }
      const url = await to_data_url(result.data)
      remember(cid, { url })
      return url
    } catch {
      remember(cid, { missing_until: Date.now() + MISS_RETRY_MS })
      return null
    } finally {
      in_flight.delete(cid)
    }
  })()
  in_flight.set(cid, loading)
  return await loading
}

export const subscribe_images = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// A node switch: another node may not hold the same images.
export const clear_images = (): void => {
  entries.clear()
  for (const listener of listeners) listener()
}
