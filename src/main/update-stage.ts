// Fetching and staging one release's update (spec §8.2.5, §8.10.10), in this
// order, each step refusing the update before the next runs:
// 1. the manifest and its detached signature, verified against the pinned key
//    before the manifest is parsed (update-signature.ts);
// 2. the manifest names this app and the release's version;
// 3. the .zip, streamed to the staging directory under the size the manifest
//    signs and hashed on the way, must match the signed SHA-256;
// 4. extracted with ditto, the one bundle inside must have a code signature
//    that verifies, and carry this app's bundle identifier and that version.
// Every URL is https, redirects included. Nothing imports Electron.

import { createHash, type KeyObject } from 'node:crypto'
import { execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { MANIFEST_ASSET, SIGNATURE_ASSET, verify_manifest } from './update-signature.ts'

const exec_file = promisify(execFile)

const MANIFEST_LIMIT_BYTES = 64 * 1024

export type Fetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>

export interface AppInspection { app_id: string, version: string }

// codesign checks the whole bundle's seal; plutil reads the two plist keys.
export const inspect_app_bundle = async (app_path: string): Promise<AppInspection> => {
  try {
    await exec_file('codesign', ['--verify', '--deep', '--strict', app_path])
  } catch {
    throw new Error('The staged update\'s code signature does not verify.')
  }
  const read = async (key: string): Promise<string> => (await exec_file('plutil', ['-extract', key, 'raw', join(app_path, 'Contents/Info.plist')])).stdout.trim()
  return { app_id: await read('CFBundleIdentifier'), version: await read('CFBundleShortVersionString') }
}

export const extract_zip = async (zip_path: string, dir: string): Promise<void> => {
  await exec_file('ditto', ['-x', '-k', zip_path, dir])
}

const fetch_https = async (fetch: Fetch, url: string): Promise<Response> => {
  if (!url.startsWith('https://')) throw new Error('An update URL is not https.')
  const response = await fetch(url, { headers: { 'User-Agent': 'Record' } })
  if (!response.url.startsWith('https://') && response.url !== '') throw new Error('An update download was redirected off https.')
  if (!response.ok) throw new Error(`An update download failed with HTTP ${response.status}.`)
  return response
}

const read_limited = async (response: Response, limit: number): Promise<Uint8Array> => {
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > limit) throw new Error('An update file is larger than expected.')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length > limit) throw new Error('An update file is larger than expected.')
  return bytes
}

// Streams the body to a file, refusing past `size` bytes, and returns the
// SHA-256 and byte count of what was written.
const download_to = async (response: Response, path: string, size: number): Promise<{ sha256: string, bytes: number }> => {
  if (response.body === null) throw new Error('An update download had no body.')
  const hash = createHash('sha256')
  const file = createWriteStream(path, { mode: 0o600 })
  let bytes = 0
  try {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      bytes += chunk.length
      if (bytes > size) throw new Error('The update is larger than its signed size.')
      hash.update(chunk)
      if (!file.write(chunk)) await new Promise<void>((resolve) => { file.once('drain', () => { resolve() }) })
    }
  } finally {
    await new Promise<void>((resolve) => { file.end(() => { resolve() }) })
  }
  return { sha256: hash.digest('hex'), bytes }
}

export const stage_update = async ({ assets, version, app_id, public_key, staging_dir, fetch, extract = extract_zip, inspect = inspect_app_bundle }: {
  // Asset name to its https download URL.
  assets: Map<string, string>
  version: string
  app_id: string
  public_key: KeyObject
  staging_dir: string
  fetch: Fetch
  extract?: (zip_path: string, dir: string) => Promise<void>
  inspect?: (app_path: string) => Promise<AppInspection>
}): Promise<string> => {
  const manifest_url = assets.get(MANIFEST_ASSET)
  if (manifest_url === undefined) throw new Error('The release has no update manifest.')
  const signature_url = assets.get(SIGNATURE_ASSET)
  const signature_text = signature_url === undefined
    ? null
    : Buffer.from(await read_limited(await fetch_https(fetch, signature_url), 1024)).toString('utf8')
  const manifest_bytes = await read_limited(await fetch_https(fetch, manifest_url), MANIFEST_LIMIT_BYTES)
  const manifest = verify_manifest({ manifest_bytes, signature_text, public_key })
  if (manifest.app_id !== app_id) throw new Error('The signed update is for a different app.')
  if (manifest.version !== version) throw new Error('The signed update is not the release\'s version.')
  const zip_url = assets.get(manifest.file)
  if (zip_url === undefined) throw new Error('The release lacks the update file its manifest names.')

  await rm(staging_dir, { recursive: true, force: true })
  await mkdir(staging_dir, { recursive: true, mode: 0o700 })
  try {
    const zip_path = join(staging_dir, 'update.zip')
    const written = await download_to(await fetch_https(fetch, zip_url), zip_path, manifest.size)
    if (written.bytes !== manifest.size || written.sha256 !== manifest.sha256) throw new Error('The update does not match its signed hash.')
    const app_dir = join(staging_dir, 'app')
    await extract(zip_path, app_dir)
    await rm(zip_path, { force: true })
    const bundles = (await readdir(app_dir)).filter((name) => name.endsWith('.app'))
    if (bundles.length !== 1) throw new Error('The update does not hold exactly one app.')
    const staged_app_path = join(app_dir, bundles[0] as string)
    const found = await inspect(staged_app_path)
    if (found.app_id !== app_id || found.version !== version) throw new Error('The staged update is not this app at the release\'s version.')
    return staged_app_path
  } catch (error) {
    await rm(staging_dir, { recursive: true, force: true })
    throw error
  }
}
