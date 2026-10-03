import { describe, expect, test } from 'bun:test'

import { create_secret_clipboard, SECRET_CLIPBOARD_MS } from '#main/clipboard-expiry.ts'

const create_fake_clipboard = () => {
  const state = { text: '', clears: 0 }
  return {
    state,
    clipboard: {
      readText: () => state.text,
      writeText: (text: string) => { state.text = text },
      clear: () => { state.text = ''; state.clears++ }
    }
  }
}

const sleep = async (ms: number) => { await new Promise((resolve) => setTimeout(resolve, ms)) }

describe('secret clipboard', () => {
  test('clears the copied key after the delay when the clipboard still holds it', async () => {
    const { state, clipboard } = create_fake_clipboard()
    const secret = create_secret_clipboard({ clipboard, clear_after_ms: 10 })
    expect(await secret.copy('the-key')).toEqual({ clears_in_ms: 10 })
    expect(state.text).toBe('the-key')
    await sleep(30)
    expect(state).toEqual({ text: '', clears: 1 })
    expect(SECRET_CLIPBOARD_MS).toBe(60_000)
  })

  test('leaves the clipboard alone when the user copied something else since', async () => {
    const { state, clipboard } = create_fake_clipboard()
    await create_secret_clipboard({ clipboard, clear_after_ms: 10 }).copy('the-key')
    clipboard.writeText('something else')
    await sleep(30)
    expect(state).toEqual({ text: 'something else', clears: 0 })
  })
})
