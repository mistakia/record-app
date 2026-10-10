// The one keyboard dispatch point: every key press goes through
// resolve_hotkey (hotkeys.ts), and its action routes to the player
// controller, the shown track list's commands, or navigation. After g, the
// next key goes to a page or a sidebar library (resolve_go) and is never
// passed on; a click or leaving the window closes the lead.

import { useEffect } from 'react'
import { useStore } from 'react-redux'
import { useNavigate } from 'react-router'

import { is_field, resolve_go, resolve_hotkey, type GoTarget, type HotkeyAction } from './hotkeys.ts'
import { section_index_commands } from '#renderer/components/common/indexed-page.tsx'
import { own_library_address, sidebar_libraries } from '#renderer/components/library/library-category.ts'
import { now_playing_commands } from '#renderer/components/player/now-playing-commands.ts'
import { list_commands } from '#renderer/components/track/list-commands.ts'
import {
  next_track,
  previous_track,
  seek_playback,
  set_playback_volume,
  set_repeat_mode,
  toggle_mute,
  toggle_playback,
  toggle_shuffle_mode
} from '#renderer/player/player-controller.ts'
import type { RepeatMode } from '#renderer/player/queue-manager.ts'
import { ROUTES, tracks_route } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import type { AppDispatch, RootState } from '#renderer/store/index.ts'
import { help_toggled, lead_toggled, queue_toggled, shortcuts_toggled } from '#renderer/store/ui.ts'

export const SEARCH_INPUT_ID = 'track-search'

const SEEK_STEP_SECONDS = 5
const VOLUME_STEP = 0.05
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' }

export const use_hotkeys = (): void => {
  const navigate = useNavigate()
  const store = useStore<RootState>()

  useEffect(() => {
    const dispatch = store.dispatch as AppDispatch
    const list = list_commands
    const libraries = () => node_api.endpoints.get_libraries.select()(store.getState()).data
    const PAGES: Record<Exclude<GoTarget, 'library'>, string> = {
      tracks: ROUTES.tracks,
      listens: ROUTES.listens,
      libraries: ROUTES.libraries,
      import: ROUTES.import,
      identity: ROUTES.identity,
      settings: ROUTES.settings
    }
    const go = (key: string): void => {
      const target = resolve_go(key)
      if (target === null) return
      if (typeof target === 'object') {
        const library = sidebar_libraries(libraries())[target.library]
        if (library !== undefined) navigate(tracks_route({ library_address: library.address }))
      } else if (target === 'library') {
        const own = own_library_address(libraries())
        navigate(own === null ? ROUTES.libraries : tracks_route({ library_address: own }))
      } else {
        navigate(PAGES[target])
      }
    }

    const run = (action: HotkeyAction, target: EventTarget | null): boolean => {
      const { player, ui } = store.getState()
      switch (action) {
        case 'cursor_down': list()?.move({ by: 1, extend: false }); return true
        case 'cursor_up': list()?.move({ by: -1, extend: false }); return true
        case 'extend_down': list()?.move({ by: 1, extend: true }); return true
        case 'extend_up': list()?.move({ by: -1, extend: true }); return true
        case 'cursor_first': list()?.move_to({ edge: 'first', extend: false }); return true
        case 'cursor_last': list()?.move_to({ edge: 'last', extend: false }); return true
        case 'extend_first': list()?.move_to({ edge: 'first', extend: true }); return true
        case 'extend_last': list()?.move_to({ edge: 'last', extend: true }); return true
        case 'toggle_selection': list()?.toggle_selection(); return true
        case 'play_cursor': list()?.play(); return true
        case 'play_next': list()?.play_next(); return true
        case 'add_to_queue': list()?.add_to_queue(); return true
        case 'tag': list()?.tag(); return true
        case 'adopt': list()?.adopt(); return true
        case 'toggle_inspector': list()?.toggle_inspector(); return true
        case 'open_menu': list()?.open_menu(); return true
        // With nothing playing the key passes on.
        case 'adopt_playing': {
          const playing = now_playing_commands()
          playing?.adopt()
          return playing !== null
        }
        case 'open_playing_menu': {
          const playing = now_playing_commands()
          playing?.open_menu()
          return playing !== null
        }
        case 'focus_search': {
          const search = document.getElementById(SEARCH_INPUT_ID)
          if (search === null) navigate(ROUTES.tracks)
          else search.focus()
          return true
        }
        case 'escape': {
          // A field gives the keys back to the list.
          if (is_field(target)) {
            (target as HTMLElement).blur()
            list()?.focus()
            return true
          }
          if (ui.shortcuts_open) {
            dispatch(shortcuts_toggled(false))
            return true
          }
          return list()?.escape() ?? false
        }
        case 'toggle_playback': toggle_playback(); return true
        case 'previous_track': previous_track(); return true
        case 'next_track': next_track(); return true
        case 'seek_back': seek_playback(Math.max(0, player.position_seconds - SEEK_STEP_SECONDS)); return true
        case 'seek_forward': seek_playback(player.position_seconds + SEEK_STEP_SECONDS); return true
        // While muted, a step starts from the level the mute holds.
        case 'volume_down': set_playback_volume((player.muted_volume ?? player.volume) - VOLUME_STEP); return true
        case 'volume_up': set_playback_volume((player.muted_volume ?? player.volume) + VOLUME_STEP); return true
        case 'toggle_mute': toggle_mute(); return true
        case 'cycle_repeat': set_repeat_mode(NEXT_REPEAT[player.queue.repeat]); return true
        case 'toggle_shuffle': toggle_shuffle_mode(); return true
        case 'toggle_queue': dispatch(queue_toggled()); return true
        // Off a page with a section index the key passes on.
        case 'previous_section':
        case 'next_section': {
          const index = section_index_commands()
          index?.step(action === 'next_section' ? 1 : -1)
          return index !== null
        }
        case 'back': navigate(-1); return true
        case 'forward': navigate(1); return true
        case 'lead': dispatch(lead_toggled(true)); return true
        case 'show_help': dispatch(help_toggled()); return true
        case 'go_settings': navigate(ROUTES.settings); return true
        case 'import_files': navigate(`${ROUTES.import}?pick=1`); return true
        case 'show_shortcuts': dispatch(shortcuts_toggled()); return true
      }
    }

    const on_keydown = (event: KeyboardEvent): void => {
      if (store.getState().ui.lead_open) {
        // A bare modifier is part of the next key, not the next key.
        if (['Shift', 'Meta', 'Control', 'Alt'].includes(event.key)) return
        event.preventDefault()
        dispatch(lead_toggled(false))
        if (event.key !== 'Escape' && !event.metaKey && !event.ctrlKey && !event.altKey) go(event.key)
        return
      }
      const action = resolve_hotkey({
        key: event.key,
        meta: event.metaKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        in_field: is_field(event.target),
        dialog_open: document.querySelector('dialog[open]') !== null,
        menu_open: document.querySelector('[role=menu]') !== null,
        list_shown: list() !== null
      })
      if (action === null) return
      if (run(action, event.target)) event.preventDefault()
    }
    const close_lead = (): void => { if (store.getState().ui.lead_open) dispatch(lead_toggled(false)) }
    window.addEventListener('keydown', on_keydown)
    window.addEventListener('mousedown', close_lead)
    window.addEventListener('blur', close_lead)
    return () => {
      window.removeEventListener('keydown', on_keydown)
      window.removeEventListener('mousedown', close_lead)
      window.removeEventListener('blur', close_lead)
    }
  }, [navigate, store])
}
