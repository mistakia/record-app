import { describe, expect, test } from 'bun:test'

import { create_audio_engine } from '#renderer/player/audio-engine.ts'
import { create_mock_context, sleep } from './mock-audio-context.ts'

// Durations by cid; the mock decodes a buffer whose duration is its byte length.
const DURATIONS: Record<string, number> = { a: 40, b: 50, c: 20, short: 10, long: 300 }

const create_test_engine = ({ hold_resume = false, hold_loads = false } = {}) => {
  const mock = create_mock_context({ hold_resume })
  const loads: Array<{ cid: string, signal: AbortSignal, resolve: () => void }> = []
  const engine = create_audio_engine({
    create_context: () => mock.as_audio_context,
    tick_ms: 1,
    load_audio: async ({ cid, signal }) => {
      const data = new ArrayBuffer(DURATIONS[cid] ?? 1)
      if (!hold_loads) {
        loads.push({ cid, signal, resolve: () => {} })
        return data
      }
      return await new Promise<ArrayBuffer>((resolve) => { loads.push({ cid, signal, resolve: () => { resolve(data) } }) })
    }
  })
  const advances: string[] = []
  engine.on_advance((key) => { advances.push(key) })
  return { engine, mock, loads, advances }
}

const track = (cid: string, key = `key-${cid}`) => ({ key, cid })

const playing = async ({ cid = 'a', ...options }: { cid?: string, hold_resume?: boolean, hold_loads?: boolean } = {}) => {
  const setup = create_test_engine(options)
  const played = setup.engine.play({ track: track(cid) })
  setup.mock.release_resumes()
  for (const load of setup.loads) load.resolve()
  await played
  expect(setup.engine.get_snapshot()).toMatchObject({ state: 'playing', key: `key-${cid}`, play_id: 1 })
  return setup
}

describe('gapless splice', () => {
  test('the next source starts at exactly the context time the current buffer ends, and takes over without a gap', async () => {
    const { engine, mock, advances } = await playing()
    mock.context.currentTime = 5
    engine.set_next(track('b'))
    // 35 s remain, over the 30 s pre-buffer point: nothing is fetched yet.
    await sleep()
    expect(mock.sources).toHaveLength(1)
    mock.context.currentTime = 12
    await sleep()
    const [first, second] = mock.sources
    expect(second?.start_when).toBe(40)
    expect(second?.start_when).toBe((first?.start_when ?? 0) + (first?.buffer?.duration ?? 0))
    expect(second?.start_offset).toBe(0)

    mock.finish(first)
    expect(advances).toEqual(['key-b'])
    expect(engine.get_snapshot()).toMatchObject({ state: 'playing', key: 'key-b', play_id: 2, duration_seconds: 50 })
    mock.context.currentTime = 41
    await sleep()
    expect(engine.get_snapshot().position_seconds).toBeCloseTo(1, 5)
  })

  test('a track shorter than the pre-buffer window pre-buffers at once, and repeat of the same audio reuses its buffer', async () => {
    const { engine, mock, loads } = await playing({ cid: 'short' })
    engine.set_next(track('short', 'key-short'))
    await sleep()
    const [first, second] = mock.sources
    expect(loads.map(({ cid }) => cid)).toEqual(['short'])
    expect(second?.buffer).toBe(first?.buffer ?? null)
    expect(second?.start_when).toBe(10)
  })

  test('changing the next track aborts its download and drops it; at most two buffers exist', async () => {
    const { engine, mock, loads } = await playing({ hold_loads: true })
    mock.context.currentTime = 15
    engine.set_next(track('b'))
    await sleep()
    const b_load = loads.find(({ cid }) => cid === 'b')
    expect(b_load?.signal.aborted).toBe(false)
    engine.set_next(track('c'))
    await sleep()
    expect(b_load?.signal.aborted).toBe(true)
    b_load?.resolve()
    loads.find(({ cid }) => cid === 'c')?.resolve()
    await sleep()
    // Only c was scheduled, at a's end.
    expect(mock.sources.map(({ buffer }) => buffer?.duration)).toEqual([40, 20])
    expect(mock.sources[1]?.start_when).toBe(40)
  })

  test('set_next(null) unschedules a spliced-in next, and the track then ends on its own', async () => {
    const { engine, mock } = await playing()
    mock.context.currentTime = 15
    engine.set_next(track('b'))
    await sleep()
    const scheduled = mock.sources[1]
    engine.set_next(null)
    expect(scheduled?.stop_when).not.toBeNull()
    mock.finish(mock.sources[0])
    expect(engine.get_snapshot().state).toBe('ended')
  })

  test('pause unschedules the next source and resume schedules it at the new end', async () => {
    const { engine, mock } = await playing()
    mock.context.currentTime = 15
    engine.set_next(track('b'))
    await sleep()
    engine.pause()
    expect(mock.sources[1]?.stop_when).not.toBeNull()
    mock.context.currentTime = 100
    await engine.resume()
    const resumed = mock.sources[2]
    const rescheduled = mock.sources[3]
    expect(resumed?.start_when).toBe(100)
    expect(resumed?.start_offset).toBe(15)
    expect(rescheduled?.start_when).toBe(125)
  })

  test('playing the pre-buffered next track uses its buffer instead of fetching again', async () => {
    const { engine, mock, loads } = await playing()
    mock.context.currentTime = 15
    engine.set_next(track('b'))
    await sleep()
    expect(loads.map(({ cid }) => cid)).toEqual(['a', 'b'])
    await engine.play({ track: track('b') })
    expect(loads.map(({ cid }) => cid)).toEqual(['a', 'b'])
    expect(engine.get_snapshot()).toMatchObject({ state: 'playing', key: 'key-b', duration_seconds: 50 })
  })
})

describe('seek', () => {
  test('ramps the fade gain down over 5 ms, swaps sources at the silent point, and ramps back up', async () => {
    const { engine, mock } = await playing()
    mock.context.currentTime = 10
    engine.seek(20)
    const [first, second] = mock.sources
    expect(first?.stop_when).toBeCloseTo(10.005, 9)
    expect(second?.start_when).toBeCloseTo(10.005, 9)
    expect(second?.start_offset).toBe(20)
    const expected: Array<[string, number, number]> = [['cancel', 0, 10], ['set', 1, 10], ['ramp', 0, 10.005], ['set', 0, 10.005], ['ramp', 1, 10.01]]
    expect(mock.fade_events.map(([kind, value]) => [kind, value])).toEqual(expected.map(([kind, value]) => [kind, value]))
    mock.fade_events.forEach(([, , time], index) => { expect(time).toBeCloseTo(expected[index]?.[2] ?? Number.NaN, 9) })
    expect(engine.get_snapshot().position_seconds).toBe(20)
  })

  test('while paused only moves the position, and from ended becomes paused', async () => {
    const { engine, mock } = await playing({ cid: 'c' })
    engine.pause()
    engine.seek(7)
    expect(mock.sources).toHaveLength(1)
    expect(engine.get_snapshot()).toMatchObject({ state: 'paused', position_seconds: 7 })
    await engine.resume()
    mock.finish(mock.sources[1])
    expect(engine.get_snapshot().state).toBe('ended')
    engine.seek(3)
    expect(engine.get_snapshot()).toMatchObject({ state: 'paused', position_seconds: 3 })
  })
})

describe('played time', () => {
  test('counts context time played, not position: pauses add nothing and a seek skips nothing', async () => {
    const { engine, mock } = await playing()
    mock.context.currentTime = 30
    await sleep()
    engine.pause()
    expect(engine.get_snapshot().played_seconds).toBeCloseTo(30, 5)
    mock.context.currentTime = 500
    await engine.resume()
    engine.seek(0)
    mock.context.currentTime = 515
    await sleep()
    expect(engine.get_snapshot().played_seconds).toBeCloseTo(45, 5)
  })

  test('a gapless advance credits the outgoing play to its end and starts the new play at zero', async () => {
    const { engine, mock } = await playing()
    const seen: Array<[number, number]> = []
    engine.subscribe(({ play_id, played_seconds }) => { seen.push([play_id, played_seconds]) })
    mock.context.currentTime = 15
    engine.set_next(track('b'))
    await sleep()
    mock.finish(mock.sources[0])
    const last_of_first = seen.filter(([play_id]) => play_id === 1).at(-1)
    expect(last_of_first?.[1]).toBeCloseTo(40, 5)
    expect(engine.get_snapshot()).toMatchObject({ play_id: 2, played_seconds: 0 })
  })
})

describe('play and resume', () => {
  test('play starts at start_at, clamped to the track', async () => {
    for (const [start_at, expected] of [[4, 4], [-3, 0], [99, 40]] as Array<[number, number]>) {
      const { engine, mock } = create_test_engine()
      await engine.play({ track: track('a'), start_at })
      expect(mock.sources[0]?.start_offset).toBe(expected)
      expect(engine.get_snapshot().position_seconds).toBe(expected)
    }
  })

  test('a play that a later play overtook is dropped', async () => {
    const { engine, mock, loads } = create_test_engine({ hold_loads: true })
    const first = engine.play({ track: track('a') })
    const second = engine.play({ track: track('b') })
    await sleep()
    expect(loads[0]?.signal.aborted).toBe(true)
    for (const load of loads) load.resolve()
    await Promise.all([first, second])
    expect(mock.sources.map(({ buffer }) => buffer?.duration)).toEqual([50])
    expect(engine.get_snapshot().key).toBe('key-b')
  })

  test('starts nothing when stopped while the context resumes', async () => {
    const { engine, mock } = await playing({ hold_resume: true })
    engine.pause()
    const resumed = engine.resume()
    engine.stop()
    mock.release_resumes()
    await resumed
    expect(engine.get_snapshot().state).toBe('idle')
    expect(mock.sources).toHaveLength(1)
  })

  test('starts one source when resume is called twice at once', async () => {
    const { engine, mock } = await playing({ hold_resume: true })
    engine.pause()
    const first = engine.resume()
    const second = engine.resume()
    mock.release_resumes()
    await Promise.all([first, second])
    expect(engine.get_snapshot().state).toBe('playing')
    expect(mock.sources).toHaveLength(2)
  })
})

describe('playback review regressions', () => {
  test('a skip just past 60 s reports the outgoing play under its own key, and the new track starts from zero', async () => {
    const { engine, mock } = await playing({ cid: 'long' })
    const seen: Array<{ key: string | null, play_id: number, played_seconds: number }> = []
    engine.subscribe(({ key, play_id, played_seconds }) => { seen.push({ key, play_id, played_seconds }) })
    // The last tick ran just under 60 s; the skip comes before the next one.
    mock.context.currentTime = 59.9
    await sleep()
    mock.context.currentTime = 60.1
    await engine.play({ track: track('c') })
    const outgoing = seen.filter(({ key, play_id }) => key === 'key-long' && play_id === 1)
    expect(outgoing.at(-1)?.played_seconds).toBeCloseTo(60.1, 5)
    // Nothing ever pairs the new key with the old play_id and its time.
    expect(seen.some(({ key, play_id, played_seconds }) => key === 'key-c' && play_id === 1 && played_seconds > 0)).toBe(false)
    expect(engine.get_snapshot()).toMatchObject({ key: 'key-c', play_id: 2, played_seconds: 0 })
  })

  test('a superseded play is not decoded: three rapid plays decode once', async () => {
    const { engine, mock, loads } = create_test_engine({ hold_loads: true })
    let decodes = 0
    const decode = mock.context.decodeAudioData
    mock.context.decodeAudioData = async (data: ArrayBuffer) => { decodes++; return await decode(data) }
    const plays = [engine.play({ track: track('a') }), engine.play({ track: track('b') }), engine.play({ track: track('c') })]
    await sleep()
    for (const load of loads) load.resolve()
    await Promise.all(plays)
    expect(decodes).toBe(1)
    expect(engine.get_snapshot().key).toBe('key-c')
  })

  test('a replaced pre-buffer download is not decoded', async () => {
    const { engine, mock, loads } = await playing({ hold_loads: true })
    let decodes = 0
    const decode = mock.context.decodeAudioData
    mock.context.decodeAudioData = async (data: ArrayBuffer) => { decodes++; return await decode(data) }
    mock.context.currentTime = 15
    engine.set_next(track('b'))
    await sleep()
    engine.set_next(track('c'))
    await sleep()
    loads.find(({ cid }) => cid === 'b')?.resolve()
    loads.find(({ cid }) => cid === 'c')?.resolve()
    await sleep()
    expect(decodes).toBe(1)
  })

  test('a pause after the splice point but before onended pauses the audible next track, not the old one', async () => {
    const { engine, mock, advances } = await playing()
    mock.context.currentTime = 15
    engine.set_next(track('b'))
    await sleep()
    // b has been audible for half a second; a's onended has not arrived.
    mock.context.currentTime = 40.5
    engine.pause()
    expect(advances).toEqual(['key-b'])
    expect(engine.get_snapshot()).toMatchObject({ state: 'paused', key: 'key-b', play_id: 2 })
    expect(engine.get_snapshot().position_seconds).toBeCloseTo(0.5, 5)
    await engine.resume()
    expect(mock.sources.at(-1)?.buffer?.duration).toBe(50)
    expect(mock.sources.at(-1)?.start_offset).toBeCloseTo(0.5, 5)
  })

  test('a seek after the splice point seeks within the audible next track', async () => {
    const { engine, mock } = await playing()
    mock.context.currentTime = 15
    engine.set_next(track('b'))
    await sleep()
    mock.context.currentTime = 41
    engine.seek(10)
    expect(engine.get_snapshot()).toMatchObject({ key: 'key-b', position_seconds: 10 })
    expect(mock.sources.at(-1)?.buffer?.duration).toBe(50)
    expect(mock.sources.at(-1)?.start_offset).toBe(10)
  })
})
