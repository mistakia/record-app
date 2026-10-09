// Runs a write and reports the outcome as a toast, so every write surface
// tells the user the same way whether it worked. A refused write (stale
// data, spec §8.8.3) says why. Success is `ok`, never the data: a DELETE or
// a 202 answers with no body.

import type { NodeFailure } from '#shared/bridge.ts'
import type { AppDispatch } from './index.ts'
import { notified } from './notifications.ts'

export type WriteOutcome<T> = { ok: true, data: T } | { ok: false }

export const report_write = async <T>({ dispatch, write, success }: {
  dispatch: AppDispatch
  // A dispatched mutation, or any promise of the same result shape.
  write: PromiseLike<{ data?: T | undefined, error?: unknown }>
  success: string | null
}): Promise<WriteOutcome<T>> => {
  const result = await write
  if (result.error !== undefined) {
    const failure = result.error as Partial<NodeFailure> & { code?: unknown }
    // Spec §8.6.8 words these two refusals for the user.
    const message = failure.code === 'CAPABILITY_EXPIRED'
      ? 'The capability authorizing this action has expired.'
      : failure.code === 'CAPABILITY_REVOKED'
        ? 'The capability authorizing this action has been revoked.'
        : typeof failure.message === 'string' ? failure.message : 'The node did not accept the change.'
    dispatch(notified({ kind: 'error', message }))
    return { ok: false }
  }
  if (success !== null) dispatch(notified({ kind: 'info', message: success }))
  return { ok: true, data: result.data as T }
}
