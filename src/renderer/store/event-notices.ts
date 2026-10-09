// Events worth a toast with an action (STYLE.md § Overlays): a linked
// library's index moved (LIBRARY UPDATED, refresh), and an import finished
// (IMPORT FINISHED, go to tracks). Everything else only refetches.

import type { Library } from '#renderer/api/types.ts'
import { library_name } from '#renderer/components/library/library-category.ts'
import type { NodeEventMessage } from '#shared/bridge.ts'
import type { Notification } from './notifications.ts'

export const notice_for_event = ({ message, libraries }: { message: NodeEventMessage, libraries: readonly Library[] | undefined }): Omit<Notification, 'id'> | null => {
  const { type, payload } = message
  if (type === 'library:index-updated' && typeof payload.library_address === 'string') {
    const library = libraries?.find(({ address }) => address === payload.library_address)
    // Own libraries change by this identity's own hand; no news there.
    if (library === undefined || library.is_own) return null
    return {
      kind: 'info',
      title: 'Library updated',
      message: `${library_name(library)} has new entries.`,
      action: { label: 'refresh', invalidate: ['tracks', 'tags', 'libraries'] },
      key: `library-updated:${library.address}`
    }
  }
  if (type === 'import:finished') {
    const count = typeof payload.track_count === 'number' ? payload.track_count : null
    const errors = typeof payload.error_count === 'number' ? payload.error_count : 0
    return {
      kind: errors > 0 && count === 0 ? 'error' : 'info',
      title: 'Import finished',
      message: `${count === null ? 'Tracks' : `${count} ${count === 1 ? 'track' : 'tracks'}`} added${errors > 0 ? `, ${errors} failed` : ''}.`,
      action: { label: 'go to tracks', route: '/tracks' }
    }
  }
  return null
}
