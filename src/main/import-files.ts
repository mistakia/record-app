// Ingest from files (spec §8.9.1), with every path resolved in main
// (§8.10.3): the file picker is main's own dialog, so its paths never come
// from the renderer, and dropped files arrive as their bytes plus a bare
// name, never as a path. Imports nothing from Electron; ipc.ts supplies
// the dialog.

import { openAsBlob } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import type { NodeResult } from '#shared/bridge.ts'
import { import_files, type ImportAck } from './node-client.ts'

export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wav', 'aif', 'aiff', 'wma', 'webm', 'mp4']
export const MAX_IMPORT_FILES = 200
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 ** 3
// Dropped files arrive as bytes, held in memory here until uploaded, so one
// call carries at most this much; the renderer sends one file per call.
export const MAX_DROP_CALL_BYTES = 2 * 1024 ** 3

const refuse = (message: string): NodeResult<never> => ({ ok: false, failure: { kind: 'refused', message } })

// A dropped file's name, reduced to a safe base name with an audio
// extension, or null.
export const clean_upload_name = (name: unknown): string | null => {
  if (typeof name !== 'string') return null
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const base = basename(name.replaceAll('\\', '/')).replace(/[\u0000-\u001f\u007f]/g, '').slice(-200)
  const extension = extname(base).slice(1).toLowerCase()
  if (base === '' || base.startsWith('.') || !AUDIO_EXTENSIONS.includes(extension)) return null
  return base
}

export const import_chosen_paths = async ({ node_url, token, paths }: {
  node_url: string | null
  token?: string | null | undefined
  paths: string[]
}): Promise<NodeResult<ImportAck>> => {
  if (paths.length === 0 || paths.length > MAX_IMPORT_FILES) return refuse(`Choose between 1 and ${MAX_IMPORT_FILES} files.`)
  const files: Array<{ name: string, blob: Blob }> = []
  for (const path of paths) {
    const name = clean_upload_name(path)
    if (name === null) return refuse(`Not an audio file: ${basename(path)}`)
    const info = await stat(path)
    if (!info.isFile() || info.size > MAX_IMPORT_FILE_BYTES) return refuse(`Not a file under 2 GiB: ${name}`)
    // A file-backed blob, streamed into the upload rather than read whole.
    files.push({ name, blob: await openAsBlob(path) })
  }
  return await import_files({ node_url, token, files })
}

export const import_dropped_files = async ({ node_url, token, input, max_call_bytes = MAX_DROP_CALL_BYTES }: {
  node_url: string | null
  token?: string | null | undefined
  input: unknown
  max_call_bytes?: number
}): Promise<NodeResult<ImportAck>> => {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_IMPORT_FILES) return refuse(`Drop between 1 and ${MAX_IMPORT_FILES} files.`)
  const files: Array<{ name: string, blob: Blob }> = []
  let total_bytes = 0
  for (const item of input as unknown[]) {
    const { name, data } = (typeof item === 'object' && item !== null ? item : {}) as { name?: unknown, data?: unknown }
    const clean = clean_upload_name(name)
    if (clean === null) return refuse(`Not an audio file: ${typeof name === 'string' ? basename(name) : 'unnamed'}`)
    if (!(data instanceof ArrayBuffer) || data.byteLength === 0 || data.byteLength > MAX_IMPORT_FILE_BYTES) return refuse(`Not a file under 2 GiB: ${clean}`)
    total_bytes += data.byteLength
    if (total_bytes > max_call_bytes) return refuse(`Dropped files are uploaded one at a time; this upload is over ${max_call_bytes} bytes.`)
    files.push({ name: clean, blob: new Blob([data]) })
  }
  return await import_files({ node_url, token, files })
}
