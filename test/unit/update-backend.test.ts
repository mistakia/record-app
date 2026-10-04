import { describe, expect, test } from 'bun:test'

import { create_github_update_backend, type Updater } from '#main/update-backend.ts'
import { create_update_service } from '#main/updates.ts'

const FEED = 'https://github.com/mistakia/record-app'

// Values the backend must override: electron-updater's defaults where it
// changes them (prerelease following, as for a prerelease app version), and
// the opposite of its default for install on quit. `inactive` is an
// unpackaged run, where checkForUpdates resolves null.
const fake_updater = (available: string | null, { inactive = false } = {}) => {
  const calls = { feeds: [] as unknown[], checks: 0, downloads: 0 }
  const updater: Updater = {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    allowPrerelease: true,
    allowDowngrade: true,
    logger: console,
    setFeedURL: (options) => { calls.feeds.push(options) },
    checkForUpdates: async () => {
      calls.checks++
      if (inactive) return null
      return { isUpdateAvailable: available !== null, updateInfo: { version: available ?? '1.0.0' } } as Awaited<ReturnType<Updater['checkForUpdates']>>
    },
    downloadUpdate: async () => { calls.downloads++; return [] }
  }
  return { updater, calls }
}

describe('GitHub update backend', () => {
  test('reads the repository releases, stable without prereleases, downloading and installing only on request and at quit', () => {
    const { updater, calls } = fake_updater(null)
    create_github_update_backend({ feed_url: FEED, channel: 'stable', updater })
    expect(calls.feeds).toEqual([{ provider: 'github', owner: 'mistakia', repo: 'record-app' }])
    expect(updater.autoDownload).toBe(false)
    expect(updater.autoInstallOnAppQuit).toBe(true)
    expect(updater.allowPrerelease).toBe(false)
    expect(updater.allowDowngrade).toBe(false)
    expect(updater.logger).toBeNull()
  })

  test('takes prereleases on the beta channel, and still never downgrades', () => {
    const { updater, calls } = fake_updater(null)
    updater.allowPrerelease = false
    create_github_update_backend({ feed_url: FEED, channel: 'beta', updater })
    expect(calls.feeds).toEqual([{ provider: 'github', owner: 'mistakia', repo: 'record-app' }])
    expect(updater.allowPrerelease).toBe(true)
    expect(updater.allowDowngrade).toBe(false)
    expect(updater.autoDownload).toBe(false)
  })

  test('refuses a feed that is not a GitHub repository', () => {
    for (const feed_url of ['http://github.com/mistakia/record-app', 'https://example.org/mistakia/record-app', 'https://github.com/mistakia', 'https://github.com/mistakia/record-app/releases', 'https://github.com/mistakia/record-app.git']) {
      expect(() => create_github_update_backend({ feed_url, channel: 'stable', updater: fake_updater(null).updater })).toThrow('not a GitHub repository URL')
    }
  })

  test('reports the newer release, or none', async () => {
    expect(await create_github_update_backend({ feed_url: FEED, channel: 'stable', updater: fake_updater('1.1.0').updater }).check()).toEqual({ version: '1.1.0' })
    expect(await create_github_update_backend({ feed_url: FEED, channel: 'stable', updater: fake_updater(null).updater }).check()).toBeNull()
  })

  test('fails a check outside the packaged app instead of reporting one', async () => {
    const backend = create_github_update_backend({ feed_url: FEED, channel: 'stable', updater: fake_updater('1.1.0', { inactive: true }).updater })
    await expect(backend.check()).rejects.toThrow('packaged app')
  })

  test('drives the update service to ready without restarting', async () => {
    const { updater, calls } = fake_updater('1.1.0')
    const service = create_update_service({
      feed_url: FEED,
      channel: 'stable',
      current_version: '1.0.0',
      create_backend: (feed) => create_github_update_backend({ ...feed, updater }),
      set_interval: () => 0
    })
    service.start()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(service.get_state()).toEqual({ status: 'ready', version: '1.1.0' })
    expect(calls).toMatchObject({ checks: 1, downloads: 1 })
  })

  test('downloads a new major version only after the user opts in', async () => {
    const { updater, calls } = fake_updater('2.0.0')
    const service = create_update_service({
      feed_url: FEED,
      channel: 'stable',
      current_version: '1.4.0',
      create_backend: (feed) => create_github_update_backend({ ...feed, updater }),
      set_interval: () => 0
    })
    service.start()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(service.get_state()).toEqual({ status: 'major_available', version: '2.0.0' })
    expect(calls.downloads).toBe(0)
    await service.accept_major()
    expect(service.get_state()).toEqual({ status: 'ready', version: '2.0.0' })
    expect(calls.downloads).toBe(1)
  })
})
