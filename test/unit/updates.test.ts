import { describe, expect, test } from 'bun:test'

import { CHECK_INTERVAL_MS, create_update_service, type UpdateBackend } from '#main/updates.ts'

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
})
