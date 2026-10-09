// The ? overlay: every binding in HOTKEYS, as Settings › Shortcuts shows it.

import { Dialog } from './dialog.tsx'
import { ShortcutTable } from './shortcut-table.tsx'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { shortcuts_toggled } from '#renderer/store/ui.ts'

export const ShortcutOverlay = () => {
  const dispatch = use_app_dispatch()
  const open = use_app_selector((state) => state.ui.shortcuts_open)
  return (
    <Dialog open={open} title='Shortcuts' wide on_close={() => { dispatch(shortcuts_toggled(false)) }}>
      <ShortcutTable />
    </Dialog>
  )
}
