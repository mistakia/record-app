import { describe, expect, test } from 'bun:test'

import { create_audio_engine } from '#renderer/player/audio-engine.ts'

// Just enough of an AudioContext for the engine: resume() is held open until
// the test releases it, and every started source is recorded.
const create_mock_context = () => {
  const started: number[] = []
  const pending_resumes: Array<() => void> = []
  const context = {
    currentTime: 0,
    destination: {},
    resume: async () => await new Promise<void>((resolve) => { pending_resumes.push(resolve) }),
    createGain: () => ({ gain: { value: 1 }, connect: () => {} }),
    decodeAudioData: async () => ({ duration: 10 }),
    createBufferSource: () => ({
      buffer: null,
      onended: null,
      connect: () => {},
      disconnect: () => {},
      start: (_when: number, offset: number) => { started.push(offset) },
      stop: () => {}
    })
  }
  const release_resumes = () => { for (const resolve of pending_resumes.splice(0)) resolve() }
  return { context: context as unknown as AudioContext, started, release_resumes }
}

const playing_engine = async () => {
  const mock = create_mock_context()
  const engine = create_audio_engine({ load_audio: async () => new ArrayBuffer(8), create_context: () => mock.context, tick_ms: 60_000 })
  const played = engine.play({ cid: 'bafy' })
  mock.release_resumes()
  await played
  expect(engine.get_snapshot().state).toBe('playing')
  return { engine, ...mock }
}

describe('audio engine play', () => {
  test('starts at start_at, clamped to the track', async () => {
    for (const [start_at, expected] of [[4, 4], [-3, 0], [99, 10]] as Array<[number, number]>) {
      const mock = create_mock_context()
      const engine = create_audio_engine({ load_audio: async () => new ArrayBuffer(8), create_context: () => mock.context, tick_ms: 60_000 })
      const played = engine.play({ cid: 'bafy', start_at })
      mock.release_resumes()
      await played
      expect(mock.started).toEqual([expected])
      expect(engine.get_snapshot().position_seconds).toBe(expected)
    }
  })
})

describe('audio engine resume', () => {
  test('resumes a paused track from where it paused', async () => {
    const { engine, started, release_resumes } = await playing_engine()
    engine.pause()
    engine.seek(4)
    const resumed = engine.resume()
    release_resumes()
    await resumed
    expect(engine.get_snapshot().state).toBe('playing')
    expect(started).toEqual([0, 4])
  })

  test('starts nothing when stopped while the context resumes', async () => {
    const { engine, started, release_resumes } = await playing_engine()
    engine.pause()
    const resumed = engine.resume()
    engine.stop()
    release_resumes()
    await resumed
    expect(engine.get_snapshot().state).toBe('idle')
    expect(started).toEqual([0])
  })

  test('starts one source when resume is called twice at once', async () => {
    const { engine, started, release_resumes } = await playing_engine()
    engine.pause()
    const first = engine.resume()
    const second = engine.resume()
    release_resumes()
    await Promise.all([first, second])
    expect(engine.get_snapshot().state).toBe('playing')
    expect(started).toHaveLength(2)
  })
})
