import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

import { generate_key, sign_update } from '../../cli/update-signing-key.ts'
import { parse_public_key, verify_manifest } from '#main/update-signature.ts'

describe('update signing key', () => {
  test('generates a private key file only the owner reads, and signs a manifest the app accepts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'record-key-'))
    const key_path = join(dir, 'update-signing-key.pem')
    const public_key = generate_key(key_path)
    expect(statSync(key_path).mode & 0o777).toBe(0o600)
    expect(() => generate_key(key_path)).toThrow()
    const zip_path = join(dir, 'Record-1.1.0-universal-mac.zip')
    writeFileSync(zip_path, 'zip bytes')
    const private_key_pem = readFileSync(key_path, 'utf8')
    const { manifest_path, signature_path } = sign_update({ zip_path, private_key_pem, pinned_public_key: public_key, version: '1.1.0' })
    const manifest = verify_manifest({ manifest_bytes: readFileSync(manifest_path), signature_text: readFileSync(signature_path, 'utf8'), public_key: parse_public_key(public_key) })
    expect(manifest).toEqual({ app_id: 'org.record.app', version: '1.1.0', file: 'Record-1.1.0-universal-mac.zip', sha256: expect.stringMatching(/^[0-9a-f]{64}$/), size: 9 })
  })

  test('refuses to sign with a key that is not the pinned one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'record-key-'))
    const pinned = generate_key(join(dir, 'pinned.pem'))
    generate_key(join(dir, 'other.pem'))
    const zip_path = join(dir, 'a.zip')
    writeFileSync(zip_path, 'zip')
    const private_key_pem = readFileSync(join(dir, 'other.pem'), 'utf8')
    expect(() => sign_update({ zip_path, private_key_pem, pinned_public_key: pinned, version: '1.0.0' })).toThrow('does not match the pinned')
  })
})
