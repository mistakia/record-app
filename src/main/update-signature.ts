// Update integrity (spec §8.10.10). Every release publishes a manifest,
// update-manifest.json, naming the update .zip, its SHA-256 and size, the
// version, and the bundle identifier, and a detached Ed25519 signature over
// the manifest's exact bytes, update-manifest.json.sig. The signature is
// checked against the public key pinned in the app before the manifest is
// parsed or the .zip is fetched; the .zip is then trusted only through the
// signed SHA-256. The key is the project's own, with no identity attached, so
// nothing about a person ships in the app or the release.
//
// node:crypto only, and nothing from Electron, so tests drive it under Bun.

import { createPublicKey, verify, type KeyObject } from 'node:crypto'

export const MANIFEST_ASSET = 'update-manifest.json'
export const SIGNATURE_ASSET = `${MANIFEST_ASSET}.sig`

export interface UpdateManifest {
  app_id: string
  version: string
  file: string
  sha256: string
  size: number
}

// An Ed25519 SubjectPublicKeyInfo is this fixed DER prefix and the 32-byte key.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

// The pinned key is the raw 32-byte public key in base64, as
// cli/update-signing-key.ts prints it.
export const parse_public_key = (raw_base64: string): KeyObject => {
  const raw = Buffer.from(raw_base64, 'base64')
  if (raw.length !== 32 || raw.toString('base64') !== raw_base64.trim()) throw new Error('The pinned update key is not a base64 Ed25519 public key.')
  return createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: 'der', type: 'spki' })
}

const SHA256_HEX = /^[0-9a-f]{64}$/
const ZIP_NAME = /^[A-Za-z0-9._-]+\.zip$/

const parse_manifest = (bytes: Uint8Array): UpdateManifest => {
  let value: unknown
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'))
  } catch {
    throw new Error('The signed update manifest is not JSON.')
  }
  const manifest = value as Partial<UpdateManifest> | null
  if (manifest === null || typeof manifest !== 'object' ||
    typeof manifest.app_id !== 'string' || typeof manifest.version !== 'string' ||
    typeof manifest.file !== 'string' || !ZIP_NAME.test(manifest.file) ||
    typeof manifest.sha256 !== 'string' || !SHA256_HEX.test(manifest.sha256) ||
    typeof manifest.size !== 'number' || !Number.isSafeInteger(manifest.size) || manifest.size <= 0) {
    throw new Error('The signed update manifest is malformed.')
  }
  return { app_id: manifest.app_id, version: manifest.version, file: manifest.file, sha256: manifest.sha256, size: manifest.size }
}

// Returns the manifest only when the signature verifies; throws otherwise,
// before reading a byte of the manifest's content.
export const verify_manifest = ({ manifest_bytes, signature_text, public_key }: {
  manifest_bytes: Uint8Array
  signature_text: string | null
  public_key: KeyObject
}): UpdateManifest => {
  if (signature_text === null || signature_text.trim() === '') throw new Error('The update has no signature.')
  const signature = Buffer.from(signature_text.trim(), 'base64')
  if (signature.length !== 64 || !verify(null, manifest_bytes, public_key, signature)) {
    throw new Error('The update signature does not verify against the pinned key.')
  }
  return parse_manifest(manifest_bytes)
}

export const serialize_manifest = (manifest: UpdateManifest): string => `${JSON.stringify(manifest, null, 2)}\n`
