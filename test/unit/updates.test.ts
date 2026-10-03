import { describe, expect, test } from 'bun:test'

import { CHECK_INTERVAL_MS, compare_versions, create_update_service, type UpdateBackend } from '#main/updates.ts'

const fake_backend = (releases: Array<string | null>) => {
  const calls = { checks: 0, downloads: 0 }
  const backend: UpdateBackend = {
    check: async () => {
      const version = releases[Math.min(calls.checks++, releases.length - 1)] ?? null
      return version === null ? null : { version }
    },
    download: async () => { calls.downloads++ }
  }
  return { backend, calls }
}

const manual_interval = () => {
  const runs: Array<{ run: () => void, ms: number }> = []
  return { runs, set_interval: (run: () => void, ms: number) => { runs.push({ run, ms }); return runs.length } }
}

const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 0)) }

describe('update service', () => {
  test('with no feed it is off and never creates a backend', () => {
    let created = 0
    const service = create_update_service({ feed_url: null, channel: 'stable', current_version: '1.0.0', create_backend: () => { created++; return fake_backend([]).backend } })
    service.start()
    expect(service.get_state()).toEqual({ status: 'off', reason: 'No update feed is configured.' })
    expect(created).toBe(0)
  })

  test('refuses a feed that is not https', () => {
    let created = 0
    const service = create_update_service({ feed_url: 'http://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: () => { created++; return fake_backend([]).backend } })
    service.start()
    expect(service.get_state().status).toBe('off')
    expect(created).toBe(0)
  })

  test('checks at startup and every 4 hours, and downloads a newer minor for the next quit', async () => {
    const { backend, calls } = fake_backend([null, '1.1.0'])
    const timers = manual_interval()
    const service = create_update_service({ feed_url: 'https://updates.example.test', channel: 'beta', current_version: '1.0.0', create_backend: () => backend, set_interval: timers.set_interval })
    service.start()
    await settle()
    expect(service.get_state().status).toBe('idle')
    expect(timers.runs).toEqual([{ run: expect.any(Function), ms: CHECK_INTERVAL_MS }])
    timers.runs[0]?.run()
    await settle()
    expect(service.get_state()).toEqual({ status: 'ready', version: '1.1.0' })
    expect(calls).toEqual({ checks: 2, downloads: 1 })
  })

  test('a newer major waits for opt-in, and an older version is never taken', async () => {
    const older = fake_backend(['0.9.0'])
    const keep = create_update_service({ feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: () => older.backend, set_interval: manual_interval().set_interval })
    keep.start()
    await settle()
    expect(keep.get_state().status).toBe('idle')
    expect(older.calls.downloads).toBe(0)

    const next_major = fake_backend(['2.0.0'])
    const service = create_update_service({ feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.4.2', create_backend: () => next_major.backend, set_interval: manual_interval().set_interval })
    service.start()
    await settle()
    expect(service.get_state()).toEqual({ status: 'major_available', version: '2.0.0' })
    expect(next_major.calls.downloads).toBe(0)
    await service.accept_major()
    expect(service.get_state()).toEqual({ status: 'ready', version: '2.0.0' })
  })

  test('orders versions by semver precedence, prereleases included', () => {
    const ordered = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0', '1.0.1', '1.1.0', '2.0.0']
    for (let index = 1; index < ordered.length; index++) {
      expect([ordered[index - 1], compare_versions(ordered[index - 1] as string, ordered[index] as string)]).toEqual([ordered[index - 1], -1])
      expect(compare_versions(ordered[index] as string, ordered[index - 1] as string)).toBe(1)
    }
    expect(compare_versions('1.0.0+build.5', '1.0.0')).toBe(0)
  })

  test('takes 1.0.0-alpha.0 to 1.0.0, beta.1 to beta.2, and beta.9 to beta.10', async () => {
    for (const [current, release] of [['1.0.0-alpha.0', '1.0.0'], ['1.2.0-beta.1', '1.2.0-beta.2'], ['1.2.0-beta.9', '1.2.0-beta.10']] as const) {
      const { backend, calls } = fake_backend([release])
      const service = create_update_service({ feed_url: 'https://updates.example.test', channel: 'beta', current_version: current, create_backend: () => backend, set_interval: manual_interval().set_interval })
      service.start()
      await settle()
      expect([current, service.get_state()]).toEqual([current, { status: 'ready', version: release }])
      expect(calls.downloads).toBe(1)
    }
    const { backend } = fake_backend(['1.2.0-beta.9'])
    const older = create_update_service({ feed_url: 'https://updates.example.test', channel: 'beta', current_version: '1.2.0-beta.10', create_backend: () => backend, set_interval: manual_interval().set_interval })
    older.start()
    await settle()
    expect(older.get_state().status).toBe('idle')
  })

  test('a prerelease of the next major still waits for opt-in', async () => {
    const { backend, calls } = fake_backend(['2.0.0-beta.1'])
    const service = create_update_service({ feed_url: 'https://updates.example.test', channel: 'beta', current_version: '1.9.0', create_backend: () => backend, set_interval: manual_interval().set_interval })
    service.start()
    await settle()
    expect(service.get_state()).toEqual({ status: 'major_available', version: '2.0.0-beta.1' })
    expect(calls.downloads).toBe(0)
  })
})
