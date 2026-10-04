// The project's Ed25519 update key (spec §8.10.10, src/main/update-signature.ts).
//
//   node cli/update-signing-key.ts generate <private key path>
//     Writes a new private key, PKCS#8 PEM, to a file created with mode 0600
//     (an existing file is refused), and prints only the public key, raw 32
//     bytes in base64, for UPDATE_PUBLIC_KEY in src/main/updates.ts. Store
//     the private key file's contents as the UPDATE_SIGNING_KEY repository
//     secret, and keep the file offline.
//
//   node cli/update-signing-key.ts sign <update .zip>
//     Reads the private key from UPDATE_SIGNING_KEY, refuses one whose public
//     half is not the pinned UPDATE_PUBLIC_KEY, and writes update-manifest.json
//     (app id, package.json's version, the .zip's name, SHA-256, and size) and
//     its detached signature, update-manifest.json.sig, beside the .zip.
//
// Neither mode prints private key material.

import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { MANIFEST_ASSET, serialize_manifest, SIGNATURE_ASSET } from '../src/main/update-signature.ts'
import { UPDATE_PUBLIC_KEY } from '../src/main/updates.ts'

export const APP_ID = 'org.record.app'

const raw_public_key = (key: ReturnType<typeof createPublicKey>): string =>
  (key.export({ format: 'der', type: 'spki' })).subarray(-32).toString('base64')

export const generate_key = (private_key_path: string): string => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  writeFileSync(private_key_path, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600, flag: 'wx' })
  return raw_public_key(publicKey)
}

export const sign_update = ({ zip_path, private_key_pem, pinned_public_key, version }: {
  zip_path: string
  private_key_pem: string
  pinned_public_key: string
  version: string
}): { manifest_path: string, signature_path: string } => {
  const private_key = createPrivateKey(private_key_pem)
  if (private_key.asymmetricKeyType !== 'ed25519') throw new Error('UPDATE_SIGNING_KEY is not an Ed25519 private key.')
  if (raw_public_key(createPublicKey(private_key)) !== pinned_public_key) throw new Error('UPDATE_SIGNING_KEY does not match the pinned update public key.')
  const zip = readFileSync(zip_path)
  const manifest = serialize_manifest({
    app_id: APP_ID,
    version,
    file: basename(zip_path),
    sha256: createHash('sha256').update(zip).digest('hex'),
    size: statSync(zip_path).size
  })
  const manifest_path = join(dirname(zip_path), MANIFEST_ASSET)
  const signature_path = join(dirname(zip_path), SIGNATURE_ASSET)
  writeFileSync(manifest_path, manifest)
  writeFileSync(signature_path, `${sign(null, Buffer.from(manifest), private_key).toString('base64')}\n`)
  return { manifest_path, signature_path }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, path] = process.argv.slice(2)
  try {
    if (mode === 'generate' && path !== undefined) {
      console.log(generate_key(path))
    } else if (mode === 'sign' && path !== undefined) {
      const private_key_pem = process.env.UPDATE_SIGNING_KEY ?? ''
      if (private_key_pem.trim() === '') throw new Error('UPDATE_SIGNING_KEY is not set.')
      const root = fileURLToPath(new URL('..', import.meta.url))
      const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }
      const written = sign_update({ zip_path: path, private_key_pem, pinned_public_key: UPDATE_PUBLIC_KEY, version })
      console.log(`wrote ${written.manifest_path} and ${written.signature_path}`)
    } else {
      console.error('Usage: node cli/update-signing-key.ts generate <private key path> | sign <update .zip>')
      process.exit(2)
    }
  } catch (error) {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
