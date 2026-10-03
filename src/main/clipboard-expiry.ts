// Copies secret text (the exported private key) to the clipboard and
// clears it after a minute, unless the user has copied something else
// since. Imports nothing from Electron; ipc.ts passes the clipboard.

export const SECRET_CLIPBOARD_MS = 60_000

export interface ClipboardAccess {
  // Electron's clipboard reads and writes asynchronously.
  readText: () => string | Promise<string>
  writeText: (text: string) => void | Promise<void>
  clear: () => void
}

export const create_secret_clipboard = ({ clipboard, clear_after_ms = SECRET_CLIPBOARD_MS }: {
  clipboard: ClipboardAccess
  clear_after_ms?: number
}) => {
  let pending: ReturnType<typeof setTimeout> | null = null
  return {
    copy: async (text: string): Promise<{ clears_in_ms: number }> => {
      if (pending !== null) clearTimeout(pending)
      await clipboard.writeText(text)
      pending = setTimeout(() => {
        pending = null
        Promise.resolve(clipboard.readText())
          .then((current) => { if (current === text) clipboard.clear() })
          .catch(() => {})
      }, clear_after_ms)
      return { clears_in_ms: clear_after_ms }
    }
  }
}
