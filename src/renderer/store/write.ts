// Runs a write and reports the outcome as a toast, so every write surface
// tells the user the same way whether it worked. A refused write (stale
// data, spec §8.8.3) says why.

import type { NodeFailure } from '#shared/bridge.ts'
import type { AppDispatch } from './index.ts'
import { notified } from './notifications.ts'

export const report_write = async <T>({ dispatch, write, success }: {
  dispatch: AppDispatch
  // A dispatched mutation, or any promise of the same result shape.
  write: PromiseLike<{ data?: T | undefined, error?: unknown }>
  success: string | null
}): Promise<T | null> => {
  const result = await write
  if (result.error !== undefined) {
    const failure = result.error as Partial<NodeFailure>
    dispatch(notified({ kind: 'error', message: typeof failure.message === 'string' ? failure.message : 'The node did not accept the change.' }))
    return null
  }
  if (success !== null) dispatch(notified({ kind: 'info', message: success }))
  return (result.data ?? null) as T | null
}
