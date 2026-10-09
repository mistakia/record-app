// An avatar image from a file the user chose in main's own dialog (§8.10.3:
// the path never comes from the renderer), stored in the node with
// POST /images. Imports nothing from Electron; ipc.ts supplies the dialog.

import { openAsBlob } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'

import type { NodeResult, StoredImage } from '#shared/bridge.ts'
import { upload_image } from './node-client.ts'

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']
// The node's cap for an image blob (chapter 7, /images).
export const MAX_IMAGE_BYTES = 16 * 1024 ** 2

export const upload_chosen_image = async ({ node_url, token, path }: {
  node_url: string | null
  token?: string | null | undefined
  path: string
}): Promise<NodeResult<StoredImage>> => {
  const info = await stat(path)
  if (!info.isFile() || info.size === 0 || info.size > MAX_IMAGE_BYTES) {
    return { ok: false, failure: { kind: 'refused', message: `An avatar must be an image under 16 MiB: ${basename(path)}` } }
  }
  return await upload_image({ node_url, token, name: basename(path), blob: await openAsBlob(path) })
}
