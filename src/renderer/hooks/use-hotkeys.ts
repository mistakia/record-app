import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { resolve_hotkey } from './hotkeys.ts'
import { next_track, previous_track, toggle_playback } from '#renderer/player/player-controller.ts'

export const SEARCH_INPUT_ID = 'track-search'

const is_field = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export const use_hotkeys = (): void => {
  const navigate = useNavigate()
  useEffect(() => {
    const on_keydown = (event: KeyboardEvent): void => {
      const action = resolve_hotkey({
        key: event.key,
        meta: event.metaKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        in_field: is_field(event.target),
        dialog_open: document.querySelector('dialog[open]') !== null
      })
      if (action === null) return
      event.preventDefault()
      if (action === 'toggle_playback') toggle_playback()
      else if (action === 'next_track') next_track()
      else if (action === 'previous_track') previous_track()
      else {
        const search = document.getElementById(SEARCH_INPUT_ID)
        if (search === null) navigate('/tracks')
        else search.focus()
      }
    }
    window.addEventListener('keydown', on_keydown)
    return () => { window.removeEventListener('keydown', on_keydown) }
  }, [navigate])
}
