import type { AppDispatch } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'

// Copies a public value through main and says so.
export const copy_text = async ({ dispatch, text, label }: { dispatch: AppDispatch, text: string, label: string }): Promise<void> => {
  const result = await window.record.clipboard.write_text({ text })
  dispatch(notified(result.ok ? { kind: 'info', message: `Copied ${label}.` } : { kind: 'error', message: result.failure.message }))
}
