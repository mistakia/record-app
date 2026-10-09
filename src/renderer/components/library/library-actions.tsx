// The library menu's actions (STYLE.md § Library context menu), shared by
// the sidebar and the Libraries page: connect or disconnect, unlink with a
// confirmation, edit the replication policy, copy the address.

import { useState, type ReactNode } from 'react'

import type { Library } from '#renderer/api/types.ts'
import { copy_text } from '#renderer/components/common/copy-text.ts'
import type { MenuItem } from '#renderer/components/common/context-menu.tsx'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { DialogActions } from '#renderer/components/common/dialog-actions.tsx'
import { library_category, library_name } from '#renderer/components/library/library-category.ts'
import { ReplicationPolicyDialog } from '#renderer/components/library/replication-policy.tsx'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { library_connection_requested } from '#renderer/store/replication.ts'
import { report_write } from '#renderer/store/write.ts'

export const use_library_actions = (): {
  menu_items: (library: Library) => MenuItem[]
  set_connection: (library: Library, connect: boolean) => void
  request_unlink: (library: Library) => void
  edit_policy: (library: Library) => void
  dialogs: ReactNode
} => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const connected = use_app_selector((state) => state.replication.connected)
  const [unlinking, set_unlinking] = useState<Library | null>(null)
  const [policy_for, set_policy_for] = useState<Library | null>(null)

  const set_connection = (library: Library, connect: boolean) => {
    const endpoint = connect ? node_api.endpoints.connect_library : node_api.endpoints.disconnect_library
    report_write({ dispatch, write: dispatch(endpoint.initiate(library.address)), success: connect ? 'Replication resumed.' : 'Replication paused.' })
      .then(({ ok }) => { if (ok) dispatch(library_connection_requested({ address: library.address, connected: connect })) })
      .catch(() => {})
  }

  const unlink = async () => {
    if (unlinking === null) return
    const target = unlinking
    set_unlinking(null)
    await report_write({ dispatch, write: dispatch(node_api.endpoints.unlink_library.initiate(target.address)), success: `Unlinked ${library_name(target)}.` })
  }

  const menu_items = (library: Library): MenuItem[] => {
    const own = library_category(library) === 'own'
    const is_connected = connected[library.address] ?? library.connected
    return [
      ...(own
        ? []
        : [is_connected
            ? { label: 'Disconnect', disabled: !writes_allowed, on_select: () => { set_connection(library, false) } }
            : { label: 'Connect', disabled: !writes_allowed, on_select: () => { set_connection(library, true) } }]),
      ...(library.is_linked && !own ? [{ label: 'Unlink', disabled: !writes_allowed, on_select: () => { set_unlinking(library) } }] : []),
      ...(library.is_linked && !own ? [{ label: 'Edit replication', disabled: !writes_allowed, on_select: () => { set_policy_for(library) } }] : []),
      { label: 'Copy address', on_select: () => { copy_text({ dispatch, text: library.address, label: 'the address' }).catch(() => {}) } }
    ]
  }

  const dialogs = (
    <>
      {policy_for !== null && <ReplicationPolicyDialog key={policy_for.address} library={policy_for} on_close={() => { set_policy_for(null) }} />}
      <Dialog open={unlinking !== null} title='Unlink library' on_close={() => { set_unlinking(null) }}>
        <p>
          Unlink {unlinking === null ? '' : library_name(unlinking)}? It leaves every view, and the node drops its replica and any
          content only it held.{unlinking !== null && unlinking.held_capability_ids.length > 0 && ' Capabilities you hold there stay valid; unlinking revokes nothing.'}
        </p>
        <DialogActions>
          <button type='button' onClick={() => { set_unlinking(null) }}>Cancel</button>
          <button type='button' data-variant='danger' onClick={() => { unlink().catch(() => {}) }}>Unlink</button>
        </DialogActions>
      </Dialog>
    </>
  )

  return { menu_items, set_connection, request_unlink: set_unlinking, edit_policy: set_policy_for, dialogs }
}
