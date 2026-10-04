import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

import { app_bundle_path, install_unavailable_reason, SWAP_SCRIPT } from '#main/update-install.ts'
import { parse_public_key, serialize_manifest } from '#main/update-signature.ts'
import { stage_update } from '#main/update-stage.ts'

const errno = (code: string) => () => { throw Object.assign(new Error(code), { code }) }

describe('install location', () => {
  test('finds the bundle around the executable', () => {
    expect(app_bundle_path('/Applications/Record.app/Contents/MacOS/Record')).toBe('/Applications/Record.app')
    expect(app_bundle_path('/usr/local/bin/electron')).toBeNull()
  })

  test('reports why a copy cannot replace itself, and nothing when it can', () => {
    const ok = () => {}
    expect(install_unavailable_reason({ platform: 'linux', app_path: '/opt/Record.app', access: ok })).toContain('only on macOS')
    expect(install_unavailable_reason({ platform: 'darwin', app_path: null, access: ok })).toContain('packaged app')
    expect(install_unavailable_reason({ platform: 'darwin', app_path: '/private/var/folders/x/AppTranslocation/ABC/d/Record.app', access: ok })).toContain('temporary read-only copy')
    expect(install_unavailable_reason({ platform: 'darwin', app_path: '/Volumes/Record 1.0.0/Record.app', access: errno('EROFS') })).toContain('read-only volume')
    expect(install_unavailable_reason({ platform: 'darwin', app_path: '/Applications/Record.app', access: errno('EACCES') })).toContain('cannot replace itself in /Applications')
    expect(install_unavailable_reason({ platform: 'darwin', app_path: '/Applications/Record.app', access: ok })).toBeNull()
  })
})

// The real macOS tools: an ad-hoc signed bundle staged through ditto and
// codesign, then swapped in by the helper script after a process exits.
const darwin = process.platform === 'darwin'

const make_app = async (dir: string, version: string): Promise<string> => {
  const app = join(dir, 'Record.app')
  await mkdir(join(app, 'Contents/MacOS'), { recursive: true })
  await writeFile(join(app, 'Contents/Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>org.record.app</string>
<key>CFBundleExecutable</key><string>Record</string>
<key>CFBundleShortVersionString</key><string>${version}</string>
</dict></plist>
`)
  execFileSync('cp', ['/usr/bin/true', join(app, 'Contents/MacOS/Record')])
  execFileSync('codesign', ['--force', '--sign', '-', app])
  return app
}

describe.skipIf(!darwin)('staging and swapping with the macOS tools', () => {
  test('a signed update stages, and a bundle whose seal is broken does not', async () => {
    const work = await mkdtemp(join(tmpdir(), 'record-stage-'))
    const app = await make_app(join(work, 'build'), '1.1.0')
    const zip_path = join(work, 'Record-1.1.0-universal-mac.zip')
    execFileSync('ditto', ['-c', '-k', '--keepParent', app, zip_path])
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const public_key = parse_public_key(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64'))
    const serve = (zip: Buffer) => {
      const manifest = serialize_manifest({ app_id: 'org.record.app', version: '1.1.0', file: 'u.zip', sha256: createHash('sha256').update(zip).digest('hex'), size: zip.length })
      const files: Record<string, string | Buffer> = { m: manifest, s: sign(null, Buffer.from(manifest), privateKey).toString('base64'), z: zip }
      return {
        assets: new Map([['update-manifest.json', 'https://x/m'], ['update-manifest.json.sig', 'https://x/s'], ['u.zip', 'https://x/z']]),
        fetch: async (url: string) => new Response(files[url.slice(-1)])
      }
    }
    const staged = await stage_update({ ...serve(readFileSync(zip_path)), version: '1.1.0', app_id: 'org.record.app', public_key, staging_dir: join(work, 'staging') })
    expect(staged).toBe(join(work, 'staging/app/Record.app'))

    await writeFile(join(app, 'Contents/MacOS/Record'), 'tampered after signing')
    const broken_zip = join(work, 'broken.zip')
    execFileSync('ditto', ['-c', '-k', '--keepParent', app, broken_zip])
    await expect(stage_update({ ...serve(readFileSync(broken_zip)), version: '1.1.0', app_id: 'org.record.app', public_key, staging_dir: join(work, 'staging-broken') })).rejects.toThrow('code signature does not verify')
    expect(existsSync(join(work, 'staging-broken'))).toBe(false)
  })

  test('the helper swaps the bundle only after the process exits', async () => {
    const work = await mkdtemp(join(tmpdir(), 'record-swap-'))
    const installed = await make_app(join(work, 'Applications'), '1.0.0')
    const staged = await make_app(join(work, 'staging'), '1.1.0')
    // Orphaned at once, so launchd reaps it on exit as it does the app.
    const pid = execFileSync('/bin/sh', ['-c', 'sleep 1 >/dev/null 2>&1 & echo $!'], { encoding: 'utf8' }).trim()
    const started = Date.now()
    const helper = spawn('/bin/sh', ['-c', SWAP_SCRIPT, 'record-update', pid, installed, staged])
    let stdout = ''
    helper.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    await new Promise((resolve) => helper.on('close', resolve))
    expect(Date.now() - started).toBeGreaterThan(500)
    expect(stdout.trim()).toBe('installed')
    const version = execFileSync('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', join(installed, 'Contents/Info.plist')], { encoding: 'utf8' }).trim()
    expect(version).toBe('1.1.0')
    expect(spawnSync('codesign', ['--verify', '--deep', '--strict', installed]).status).toBe(0)
    expect(await readdir(join(work, 'Applications'))).toEqual(['Record.app'])
    expect(existsSync(staged)).toBe(false)
    expect(statSync(installed).isDirectory()).toBe(true)
  }, 15_000)
})
