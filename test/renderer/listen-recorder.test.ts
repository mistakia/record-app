import { describe, expect, test } from 'bun:test'

import { create_listen_recorder, required_listen_seconds, type Listen } from '#renderer/player/listen-recorder.ts'

const LISTEN: Listen = { track_id: 't', library_address: '/record/a/record' }
const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 1)) }

describe('required_listen_seconds', () => {
  test('is 60 s, or within a second of the end for a shorter track', () => {
    expect(required_listen_seconds({ duration_seconds: 300 })).toBe(60)
    expect(required_listen_seconds({ duration_seconds: 51 })).toBe(50)
    expect(required_listen_seconds({ duration_seconds: 0 })).toBe(60)
    expect(required_listen_seconds({ duration_seconds: 0.5 })).toBe(0)
  })
})

describe('listen recorder', () => {
  test('records once per play at the threshold, and again for a new play of the same track', async () => {
    const recorded: Listen[] = []
    const recorder = create_listen_recorder({ record: async (listen) => { recorded.push(listen); return true } })
    for (const played_seconds of [10, 59.9]) recorder.observe({ play_id: 1, played_seconds, duration_seconds: 300, listen: LISTEN })
    expect(recorded).toHaveLength(0)
    for (const played_seconds of [60, 61, 120]) recorder.observe({ play_id: 1, played_seconds, duration_seconds: 300, listen: LISTEN })
    expect(recorded).toHaveLength(1)
    recorder.observe({ play_id: 2, played_seconds: 5, duration_seconds: 300, listen: LISTEN })
    recorder.observe({ play_id: 2, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    expect(recorded).toHaveLength(2)
  })

  test('ignores plays with no listen attached and play_id 0', () => {
    const recorded: Listen[] = []
    const recorder = create_listen_recorder({ record: async (listen) => { recorded.push(listen); return true } })
    recorder.observe({ play_id: 1, played_seconds: 100, duration_seconds: 300, listen: null })
    recorder.observe({ play_id: 0, played_seconds: 100, duration_seconds: 300, listen: LISTEN })
    expect(recorded).toHaveLength(0)
  })

  test('keeps a listen the node could not take and sends it on flush', async () => {
    let accept = false
    const attempts: Listen[] = []
    const recorder = create_listen_recorder({ record: async (listen) => { attempts.push(listen); return accept } })
    recorder.observe({ play_id: 1, played_seconds: 60, duration_seconds: 300, listen: LISTEN })
    await settle()
    expect(recorder.pending_count()).toBe(1)
    accept = true
    recorder.flush_pending()
    await settle()
    expect(recorder.pending_count()).toBe(0)
    expect(attempts).toHaveLength(2)
  })
})
