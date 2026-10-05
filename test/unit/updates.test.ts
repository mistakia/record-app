import { describe, expect, test } from 'bun:test'

import { CHECK_INTERVAL_MS, compare_versions, create_update_service, type UpdateBackend, type UpdateChannel } from '#main/updates.ts'

const fake_backend = (releases: Array<string | null>) => {
  const calls = { checks: 0, downloads: 0, installs: 0 }
  const backend: UpdateBackend = {
    check: async () => {
      const version = releases[Math.min(calls.checks++, releases.length - 1)] ?? null
      return version === null ? null : { version }
    },
    download: async () => { calls.downloads++ },
    install: () => { calls.installs++ }
  }
  return { backend, calls }
}

const manual_interval = () => {
  const runs: Array<{ run: () => void, ms: number }> = []
  return { runs, set_interval: (run: () => void, ms: number) => { runs.push({ run, ms }); return runs.length } }
}

const KEY = 'pinned-key'

const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 0)) }

describe('update service', () => {
  test('refuses a feed that is not https', () => {
    let created = 0
    const service = create_update_service({ public_key: KEY, feed_url: 'http://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: () => { created++; return fake_backend([]).backend } })
    service.start()
    expect(service.get_state().status).toBe('off')
    expect(created).toBe(0)
  })

  test('checks at startup and every 4 hours, and downloads a newer minor for the next quit', async () => {
    const { backend, calls } = fake_backend([null, '1.1.0'])
    const timers = manual_interval()
    const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'beta', current_version: '1.0.0', create_backend: () => backend, set_interval: timers.set_interval })
    service.start()
    await settle()
    expect(service.get_state().status).toBe('idle')
    expect(timers.runs).toEqual([{ run: expect.any(Function), ms: CHECK_INTERVAL_MS }])
    timers.runs[0]?.run()
    await settle()
    expect(service.get_state()).toEqual({ status: 'ready', version: '1.1.0' })
    expect(calls).toEqual({ checks: 2, downloads: 1, installs: 0 })
  })

  test('a newer major waits for opt-in, and an older version is never taken', async () => {
    const older = fake_backend(['0.9.0'])
    const keep = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: () => older.backend, set_interval: manual_interval().set_interval })
    keep.start()
    await settle()
    expect(keep.get_state().status).toBe('idle')
    expect(older.calls.downloads).toBe(0)

    const next_major = fake_backend(['2.0.0'])
    const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.4.2', create_backend: () => next_major.backend, set_interval: manual_interval().set_interval })
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
      const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'beta', current_version: current, create_backend: () => backend, set_interval: manual_interval().set_interval })
      service.start()
      await settle()
      expect([current, service.get_state()]).toEqual([current, { status: 'ready', version: release }])
      expect(calls.downloads).toBe(1)
    }
    const { backend } = fake_backend(['1.2.0-beta.9'])
    const older = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'beta', current_version: '1.2.0-beta.10', create_backend: () => backend, set_interval: manual_interval().set_interval })
    older.start()
    await settle()
    expect(older.get_state().status).toBe('idle')
  })

  test('a prerelease of the next major still waits for opt-in', async () => {
    const { backend, calls } = fake_backend(['2.0.0-beta.1'])
    const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'beta', current_version: '1.9.0', create_backend: () => backend, set_interval: manual_interval().set_interval })
    service.start()
    await settle()
    expect(service.get_state()).toEqual({ status: 'major_available', version: '2.0.0-beta.1' })
    expect(calls.downloads).toBe(0)
  })

  test('a copy that cannot replace itself is off and never creates a backend', () => {
    let created = 0
    const create_backend = () => { created++; return fake_backend([]).backend }
    const stuck = create_update_service({ public_key: KEY, unavailable_reason: 'Read-only volume.', feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend })
    stuck.start()
    expect(stuck.get_state()).toEqual({ status: 'off', reason: 'Read-only volume.' })
    expect(created).toBe(0)
  })

  test('installs a staged release once, at quit, and nothing before one is staged', async () => {
    const { backend, calls } = fake_backend([null, '1.1.0'])
    const timers = manual_interval()
    const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: () => backend, set_interval: timers.set_interval })
    service.start()
    await settle()
    service.install_on_quit()
    expect(calls.installs).toBe(0)
    timers.runs[0]?.run()
    await settle()
    service.install_on_quit()
    service.install_on_quit()
    expect(calls.installs).toBe(1)
  })

  describe('update channel (spec 8.2.5)', () => {
    test('set_channel rebuilds the backend for the new channel and checks again', async () => {
      const channels: string[] = []
      const { backend, calls } = fake_backend([null, '1.1.0'])
      const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: (input) => { channels.push(input.channel); return backend }, set_interval: manual_interval().set_interval })
      service.start()
      await settle()
      expect(channels).toEqual(['stable'])
      service.set_channel('beta')
      await settle()
      expect(channels).toEqual(['stable', 'beta'])
      expect(calls.checks).toBe(2)
      expect(service.get_channel()).toBe('beta')
      // The rebuilt backend's check ran and staged the newer release.
      expect(service.get_state()).toEqual({ status: 'ready', version: '1.1.0' })
    })

    test('is a no-op for the same channel, rebuilding nothing', async () => {
      const channels: string[] = []
      const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: (input) => { channels.push(input.channel); return fake_backend([]).backend } })
      service.start()
      await settle()
      service.set_channel('stable')
      await settle()
      expect(channels).toEqual(['stable'])
    })

    test('changes nothing while the service is off; the channel is kept for when it can start', async () => {
      let created = 0
      const service = create_update_service({ public_key: KEY, unavailable_reason: 'Read-only volume.', feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: () => { created++; return fake_backend([]).backend } })
      service.start()
      expect(service.get_state()).toEqual({ status: 'off', reason: 'Read-only volume.' })
      service.set_channel('beta')
      expect(service.get_state()).toEqual({ status: 'off', reason: 'Read-only volume.' })
      expect(created).toBe(0)
      expect(service.get_channel()).toBe('beta')
    })

    test('drops a staged release when the channel changes, so it never installs at quit', async () => {
      const calls = { checks: 0, downloads: 0, installs: 0 }
      const release_for = [null, '1.1.0', null]
      const backend: UpdateBackend = {
        check: async () => {
          const version = release_for[Math.min(calls.checks++, release_for.length - 1)] ?? null
          return version === null ? null : { version }
        },
        download: async () => { calls.downloads++ },
        install: () => { calls.installs++ }
      }
      const timers = manual_interval()
      const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: () => backend, set_interval: timers.set_interval })
      service.start()
      await settle()
      timers.runs[0]?.run()
      await settle()
      expect(service.get_state()).toEqual({ status: 'ready', version: '1.1.0' })
      expect(calls.downloads).toBe(1)
      service.set_channel('beta')
      await settle()
      expect(service.get_state()).toEqual({ status: 'idle', checked_at_ms: expect.any(Number) })
      service.install_on_quit()
      expect(calls.installs).toBe(0)
    })

    test('a channel change before start is the channel the backend is built with', async () => {
      const built: UpdateChannel[] = []
      const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend: (input) => { built.push(input.channel); return fake_backend([]).backend } })
      service.set_channel('beta')
      expect(service.get_state().status).toBe('idle')
      service.start()
      await settle()
      expect(built).toEqual(['beta'])
      expect(service.get_channel()).toBe('beta')
    })

    test('a backend that cannot be built for the new channel reports it', async () => {
      const attempts: UpdateChannel[] = []
      const service = create_update_service({
        public_key: KEY,
        feed_url: 'https://updates.example.test',
        channel: 'stable',
        current_version: '1.0.0',
        create_backend: (input) => {
          attempts.push(input.channel)
          if (input.channel === 'beta') throw new Error('bad feed')
          return fake_backend([]).backend
        }
      })
      service.start()
      await settle()
      service.set_channel('beta')
      expect(service.get_state()).toEqual({ status: 'error', message: 'bad feed' })
      expect(attempts).toEqual(['stable', 'beta'])
    })

    test('a channel switch during an in-flight check discards the stale result and still checks the new channel', async () => {
      const built: UpdateChannel[] = []
      const release_holder: { release: ((found: { version: string } | null) => void) | null } = { release: null }
      const create_backend = (input: { channel: UpdateChannel }) => {
        built.push(input.channel)
        return {
          // The stable backend's startup check hangs until the test releases it.
          check: async () => {
            if (built.length === 1) return await new Promise<{ version: string } | null>((resolve) => { release_holder.release = resolve })
            return null
          },
          download: async () => {},
          install: () => {}
        }
      }
      const service = create_update_service({ public_key: KEY, feed_url: 'https://updates.example.test', channel: 'stable', current_version: '1.0.0', create_backend, set_interval: manual_interval().set_interval })
      service.start()
      await settle()
      expect(service.get_state().status).toBe('idle')
      service.set_channel('beta')
      expect(service.get_state().status).toBe('idle')
      // The old check resolves after the switch with a newer release; it must
      // not apply to the new channel, and the new channel's check must run.
      release_holder.release?.({ version: '9.9.9' })
      await settle()
      expect(service.get_state()).toEqual({ status: 'idle', checked_at_ms: expect.any(Number) })
      expect(built).toEqual(['stable', 'beta'])
    })
  })
})
