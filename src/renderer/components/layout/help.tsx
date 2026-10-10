// A page's help, disclosed on request (STYLE.md § Layout › Page column): a
// quiet `help` in the page head that opens a small paper popover with what
// the page is for and the way to every key. Closed by default, on every
// visit; Cmd+? opens and closes it from the keyboard, and Esc or a click
// elsewhere closes it.

import { useEffect, useId, useRef } from 'react'
import { useLocation } from 'react-router'

import styles from './help.module.css'
import { parse_track_view, ROUTES } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { help_toggled, shortcuts_toggled } from '#renderer/store/ui.ts'

const HELP: Record<string, string> = {
  [ROUTES.tracks]: 'Every track in your libraries and the ones you follow, in one list. j and k move, Enter plays, t tags, and i opens the details.',
  [ROUTES.listens]: 'What you played, newest first. A play counts once a minute of it has played.',
  [ROUTES.libraries]: 'Your libraries hold what you import and tag. Follow someone else’s by linking its address; its tracks replicate to this node.',
  [ROUTES.link_library]: 'Linking follows a library: its tracks replicate here and show in your tracks. Only its owner, and those they share it with, can change it.',
  [ROUTES.new_library]: 'A library is a collection with its own address, profile, and the people you let write to it. Your imports go to the library you choose.',
  [ROUTES.library_profile]: 'The profile is how this library introduces itself to the peers who link it.',
  [ROUTES.issue_capability]: 'A capability lets another identity write to this library. You can revoke it on Sharing later, which stops new writes but not past ones.',
  [ROUTES.library_sharing]: 'A capability lets another identity write to this library: add tracks or tags, perhaps only some, perhaps until a date. Revoking stops new writes, not past ones.',
  [ROUTES.import]: 'Add files or folders, drop them here, or paste a URL. Each import goes to the library named as its target.',
  [ROUTES.identity]: 'Your identity signs everything you add, on every device. Back up its key: it is the only way to recover your libraries.'
}

// A library's track list shares /tracks with All tracks, told apart by its
// ?library, and reads differently for a library of yours and one you follow.
const LIBRARY_HELP = {
  own: 'This library’s tracks. j and k move, Enter plays, t tags, and i opens the details. Imports to it land here; its Profile and Writers tabs are beside Tracks.',
  followed: 'The tracks of a library you follow, replicated to this node. j and k move, Enter plays, and f adopts a track into a library of yours.'
}

const use_help_text = (): string | undefined => {
  const { pathname, search } = useLocation()
  const own = node_api.endpoints.get_own_libraries.useQuery()
  const library = pathname === ROUTES.tracks ? parse_track_view(new URLSearchParams(search)).library_address : ''
  if (library === '') return HELP[pathname]
  return own.data?.some(({ address }) => address === library) === true ? LIBRARY_HELP.own : LIBRARY_HELP.followed
}

export const HelpButton = () => {
  const dispatch = use_app_dispatch()
  const { pathname } = useLocation()
  const open = use_app_selector((state) => state.ui.help_open)
  const set_open = (next: boolean): void => { dispatch(help_toggled(next)) }
  const root = useRef<HTMLDivElement>(null)
  const panel_id = useId()
  const text = use_help_text()

  // A new page starts with its help closed.
  useEffect(() => { dispatch(help_toggled(false)) }, [pathname, dispatch])
  useEffect(() => {
    if (!open) return
    const close_outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) dispatch(help_toggled(false)) }
    const close_on_escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dispatch(help_toggled(false)) }
    document.addEventListener('mousedown', close_outside)
    document.addEventListener('keydown', close_on_escape)
    return () => {
      document.removeEventListener('mousedown', close_outside)
      document.removeEventListener('keydown', close_on_escape)
    }
  }, [open, dispatch])

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
