import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

import { create_github_update_backend, select_release } from '#main/update-backend.ts'
import { MANIFEST_ASSET, serialize_manifest, SIGNATURE_ASSET, verify_manifest, parse_public_key } from '#main/update-signature.ts'

const FEED = 'https://github.com/mistakia/record-app'
const API = 'https://api.github.com/repos/mistakia/record-app'
const ZIP = 'Record-1.1.0-universal-mac.zip'
const ASSET_BASE = 'https://github.com/mistakia/record-app/releases/download/v1.1.0'

const key_pair = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  return { private_key: privateKey, public_key: publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64') }
}

const release = (tag: string, { prerelease = false, draft = false } = {}) => ({
  tag_name: tag,
  prerelease,
  draft,
  assets: [MANIFEST_ASSET, SIGNATURE_ASSET, ZIP].map((name) => ({ name, browser_download_url: `${ASSET_BASE}/${name}` }))
})

// A release's assets, signed with `signer`, with the parts each test breaks.
const published = ({ signer, zip = Buffer.from('zip bytes'), served_zip = zip, version = '1.1.0', signature = true, edit_manifest }: {
  signer: KeyObject
  zip?: Buffer
  served_zip?: Buffer
  version?: string
  signature?: boolean
  edit_manifest?: (text: string) => string
}) => {
  const manifest = serialize_manifest({ app_id: 'org.record.app', version, file: ZIP, sha256: createHash('sha256').update(zip).digest('hex'), size: zip.length })
  const files = new Map<string, string | Buffer>([
    [MANIFEST_ASSET, edit_manifest === undefined ? manifest : edit_manifest(manifest)],
    [ZIP, served_zip]
  ])
  if (signature) files.set(SIGNATURE_ASSET, sign(null, Buffer.from(manifest), signer).toString('base64'))
  return files
}

const fake_fetch = (releases: unknown, files: Map<string, string | Buffer>) => {
  const fetched: string[] = []
  const fetch = async (url: string): Promise<Response> => {
    fetched.push(url)
    if (url === `${API}/releases/latest`) return (releases as unknown[]).length === 0 ? new Response('{}', { status: 404 }) : Response.json((releases as unknown[])[0])
    if (url.startsWith(`${API}/releases?`)) return Response.json(releases)
    const body = files.get(url.slice(ASSET_BASE.length + 1))
    return body === undefined ? new Response('missing', { status: 404 }) : new Response(body)
  }
  return { fetch, fetched }
}

const backend_for = async ({ public_key, files, releases = [release('v1.1.0')], inspect_version = '1.1.0' }: {
  public_key: string
  files: Map<string, string | Buffer>
  releases?: unknown
  inspect_version?: string
}) => {
  const staging_dir = join(await mkdtemp(join(tmpdir(), 'record-update-')), 'staging')
  const { fetch, fetched } = fake_fetch(releases, files)
  const calls = { extracts: 0, installs: [] as string[] }
  const backend = create_github_update_backend({
    feed_url: FEED,
    public_key,
    channel: 'stable',
    app_id: 'org.record.app',
    staging_dir,
    install: (path) => { calls.installs.push(path) },
    fetch,
    extract: async (_zip, dir) => { calls.extracts++; await mkdir(join(dir, 'Record.app'), { recursive: true }) },
    inspect: async () => ({ app_id: 'org.record.app', version: inspect_version })
  })
  return { backend, fetched, calls, staging_dir }
}

describe('update signature (spec §8.10.10)', () => {
  test('a valid signed update stages and installs at quit', async () => {
    const { private_key, public_key } = key_pair()
    const { backend, calls, staging_dir } = await backend_for({ public_key, files: published({ signer: private_key }) })
    expect(await backend.check()).toEqual({ version: '1.1.0' })
    await backend.download()
    backend.install()
    expect(calls.installs).toEqual([join(staging_dir, 'app', 'Record.app')])
  })

  test('a tampered .zip is refused and nothing is staged', async () => {
    const { private_key, public_key } = key_pair()
    const { backend, calls, staging_dir } = await backend_for({ public_key, files: published({ signer: private_key, served_zip: Buffer.from('zip bytez') }) })
    await backend.check()
    await expect(backend.download()).rejects.toThrow('does not match its signed hash')
    await backend.download().catch(() => {})
    expect(calls.extracts).toBe(0)
    expect(existsSync(staging_dir)).toBe(false)
    expect(() => { backend.install() }).toThrow('No update is staged.')
  })

  test('a signature from another key is refused before the .zip is fetched', async () => {
    const pinned = key_pair()
    const other = key_pair()
    const { backend, fetched } = await backend_for({ public_key: pinned.public_key, files: published({ signer: other.private_key }) })
    await backend.check()
    await expect(backend.download()).rejects.toThrow('does not verify against the pinned key')
    await backend.download().catch(() => {})
    expect(fetched.some((url) => url.endsWith(ZIP))).toBe(false)
  })

  test('a missing signature is refused', async () => {
    const { private_key, public_key } = key_pair()
    const unsigned = { ...release('v1.1.0'), assets: release('v1.1.0').assets.filter(({ name }) => name !== SIGNATURE_ASSET) }
    const { backend, fetched } = await backend_for({ public_key, files: published({ signer: private_key, signature: false }), releases: [unsigned] })
    await backend.check()
    await expect(backend.download()).rejects.toThrow('has no signature')
    await backend.download().catch(() => {})
    expect(fetched.some((url) => url.endsWith(ZIP))).toBe(false)
  })

  test('a manifest edited after signing is refused', async () => {
    const { private_key, public_key } = key_pair()
    const files = published({ signer: private_key, edit_manifest: (text) => text.replace('1.1.0', '9.9.9') })
    const { backend } = await backend_for({ public_key, files })
    await backend.check()
    await expect(backend.download()).rejects.toThrow('does not verify against the pinned key')
  })

  test('a validly signed manifest for another version, or a staged app at another version, is refused', async () => {
    const { private_key, public_key } = key_pair()
    const replayed = await backend_for({ public_key, files: published({ signer: private_key, version: '1.0.0' }) })
    await replayed.backend.check()
    await expect(replayed.backend.download()).rejects.toThrow('not the release\'s version')
    const mislabeled = await backend_for({ public_key, files: published({ signer: private_key }), inspect_version: '1.0.0' })
    await mislabeled.backend.check()
    await expect(mislabeled.backend.download()).rejects.toThrow('not this app at the release\'s version')
  })

  test('the pinned key must be a base64 Ed25519 public key', () => {
    expect(() => parse_public_key('not a key')).toThrow('not a base64 Ed25519 public key')
    const { private_key, public_key } = key_pair()
    const manifest = Buffer.from(serialize_manifest({ app_id: 'a', version: '1.0.0', file: 'a.zip', sha256: '0'.repeat(64), size: 1 }))
    const signature_text = sign(null, manifest, private_key).toString('base64')
    expect(verify_manifest({ manifest_bytes: manifest, signature_text, public_key: parse_public_key(public_key) }).version).toBe('1.0.0')
  })
})

describe('update feed', () => {
  test('refuses a feed that is not a GitHub repository URL', () => {
    expect(() => create_github_update_backend({ feed_url: 'https://example.org/mistakia/record-app', public_key: key_pair().public_key, channel: 'stable', app_id: 'org.record.app', staging_dir: '/tmp/x', install: () => {} })).toThrow('not a GitHub repository URL')
  })

  test('stable takes only stable releases; beta also takes beta prereleases, by semver', () => {
    const releases = [release('v1.2.0-alpha.1', { prerelease: true }), release('v1.1.0'), release('v1.2.0-beta.2', { prerelease: true }), release('v1.2.0-beta.10', { prerelease: true }), release('v1.3.0', { draft: true }), release('v1.2.0-rc.1', { prerelease: true })]
    expect(select_release(releases, 'stable')?.tag_name).toBe('v1.1.0')
    expect(select_release(releases, 'beta')?.tag_name).toBe('v1.2.0-beta.10')
    expect(select_release([...releases, release('v1.2.0')], 'beta')?.tag_name).toBe('v1.2.0')
    expect(select_release([], 'beta')).toBeNull()
  })

  test('a repository with no releases reports none', async () => {
    const { backend } = await backend_for({ public_key: key_pair().public_key, files: new Map(), releases: [] })
    expect(await backend.check()).toBeNull()
  })

  test('an asset URL that is not https is refused', async () => {
    const { private_key, public_key } = key_pair()
    const plain = { ...release('v1.1.0'), assets: release('v1.1.0').assets.map((asset) => ({ ...asset, browser_download_url: asset.browser_download_url.replace('https:', 'http:') })) }
    const { backend } = await backend_for({ public_key, files: published({ signer: private_key }), releases: [plain] })
    await backend.check()
    await expect(backend.download()).rejects.toThrow('not https')
  })
})
