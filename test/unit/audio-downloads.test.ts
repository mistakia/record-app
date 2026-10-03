import { describe, expect, test } from 'bun:test'

import { create_audio_downloads } from '#main/audio-downloads.ts'
import type { NodeResult } from '#shared/bridge.ts'

const create_held_downloads = () => {
  const held: Array<{ cid: string, signal: AbortSignal, finish: () => void }> = []
  const downloads = create_audio_downloads({
    download: async ({ cid, signal }) => await new Promise<NodeResult<ArrayBuffer>>((resolve) => {
      held.push({ cid, signal, finish: () => { resolve({ ok: true, data: new ArrayBuffer(1) }) } })
      signal.addEventListener('abort', () => { resolve({ ok: false, failure: { kind: 'aborted', message: 'cancelled' } }) })
    })
  })
  return { downloads, held }
}

describe('audio downloads', () => {
  test('caps concurrent downloads at 3, refusing a fourth as busy, and frees a slot when one finishes', async () => {
    const { downloads, held } = create_held_downloads()
    const running = ['a', 'b', 'c'].map(async (cid) => await downloads.start({ cid, request_id: `r-${cid}` }))
    expect(await downloads.start({ cid: 'd', request_id: 'r-d' })).toMatchObject({ ok: false, failure: { kind: 'busy' } })
    expect(held).toHaveLength(3)
    held[0]?.finish()
    expect((await running[0])?.ok).toBe(true)
    const fourth = downloads.start({ cid: 'd', request_id: 'r-d' })
    expect(held).toHaveLength(4)
    for (const { finish } of held) finish()
    await Promise.all([...running, fourth])
    expect(downloads.count()).toBe(0)
  })

  test('cancel aborts the named download, and a request id in use is refused', async () => {
    const { downloads, held } = create_held_downloads()
    const running = downloads.start({ cid: 'a', request_id: 'same' })
    expect(await downloads.start({ cid: 'b', request_id: 'same' })).toMatchObject({ ok: false, failure: { kind: 'refused' } })
    downloads.cancel('same')
    expect(held[0]?.signal.aborted).toBe(true)
    expect(await running).toMatchObject({ ok: false, failure: { kind: 'aborted' } })
  })
})
