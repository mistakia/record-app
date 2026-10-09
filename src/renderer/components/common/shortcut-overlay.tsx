// The ? overlay: every binding in HOTKEYS, as Settings › Shortcuts shows it,
// with the track list's keys first when the page shows a list.

import { Dialog } from './dialog.tsx'
import { list_commands } from '#renderer/components/track/list-commands.ts'
import { ShortcutTable } from './shortcut-table.tsx'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { shortcuts_toggled } from '#renderer/store/ui.ts'

export const ShortcutOverlay = () => {
  const dispatch = use_app_dispatch()
  const open = use_app_selector((state) => state.ui.shortcuts_open)
  return (
    <Dialog open={open} title='Shortcuts' wide on_close={() => { dispatch(shortcuts_toggled(false)) }}>
      {open && <ShortcutTable list_first={list_commands() !== null} />}
    </Dialog>
  )
}
