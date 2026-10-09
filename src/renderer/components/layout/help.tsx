// A page's help, disclosed on request (STYLE.md § Layout › Page column): a
// quiet `help` in the page head that opens a small paper popover with what
// the page is for and the way to every key. Closed by default, on every
// visit; Esc or a click elsewhere closes it.

import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router'

import styles from './help.module.css'
import { ROUTES } from '#renderer/routes.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'
import { shortcuts_toggled } from '#renderer/store/ui.ts'

const HELP: Record<string, string> = {
  [ROUTES.tracks]: 'Every track in your libraries and the ones you follow, in one list. j and k move, Enter plays, t tags, and i opens the details.',
  [ROUTES.listens]: 'What you played, newest first. A play counts once a minute of it has played.',
  [ROUTES.libraries]: 'Your libraries hold what you import and tag. Follow someone else’s by linking its address; its tracks replicate to this node.',
  [ROUTES.link_library]: 'Linking follows a library: its tracks replicate here and show in your tracks. Only its owner, and those they share it with, can change it.',
  [ROUTES.new_library]: 'A library is a collection with its own address, profile, and the people you let write to it. Your imports go to the library you choose.',
  [ROUTES.library_profile]: 'The profile is how this library introduces itself to the peers who link it.',
  [ROUTES.library_sharing]: 'A capability lets another identity write to this library: add tracks or tags, perhaps only some, perhaps until a date. Revoking stops new writes, not past ones.',
  [ROUTES.import]: 'Add files or folders, drop them here, or paste a URL. Each import goes to the library named as its target.',
  [ROUTES.identity]: 'Your identity signs everything you add, on every device. Back up its key: it is the only way to recover your libraries.'
}

export const HelpButton = () => {
  const dispatch = use_app_dispatch()
  const { pathname } = useLocation()
  const [open, set_open] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const panel_id = useId()
  const text = HELP[pathname]

  // A new page starts with its help closed.
  useEffect(() => { set_open(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const close_outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) set_open(false) }
    const close_on_escape = (event: KeyboardEvent) => { if (event.key === 'Escape') set_open(false) }
    document.addEventListener('mousedown', close_outside)
    document.addEventListener('keydown', close_on_escape)
    return () => {
      document.removeEventListener('mousedown', close_outside)
      document.removeEventListener('keydown', close_on_escape)
    }
  }, [open])

  if (text === undefined) return null
  return (
    <div className={styles.help} ref={root}>
      <button type='button' data-variant='ghost' className={styles.toggle} aria-expanded={open} aria-controls={panel_id} onClick={() => { set_open(!open) }}>help</button>
      {open && (
        <div id={panel_id} className={styles.panel} role='dialog' aria-label='Help' data-testid='help'>
          <p className={styles.text}>{text}</p>
          <button type='button' data-variant='ghost' data-size='small' className={styles.keys} onClick={() => { set_open(false); dispatch(shortcuts_toggled(true)) }}>
            every key <kbd>?</kbd>
          </button>
        </div>
      )}
    </div>
  )
}
