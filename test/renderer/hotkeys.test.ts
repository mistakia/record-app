import { describe, expect, test } from 'bun:test'

import { TAG_LIST_ACTIONS } from '#renderer/components/tags/tag-index-rows.ts'
import { GO_KEYS, HOTKEYS, NO_LIST_ACTIONS, resolve_go, resolve_hotkey, type HotkeyAction, type KeyPress } from '#renderer/hooks/hotkeys.ts'

// Every list key, as a list answering them all.
const ALL_LIST_ACTIONS: ReadonlySet<HotkeyAction> = new Set(HOTKEYS.flatMap(({ scope, action }) => scope === 'list' ? [action] : []))

const press = (overrides: Partial<KeyPress>): KeyPress => ({ key: ' ', meta: false, ctrl: false, alt: false, shift: false, in_field: false, dialog_open: false, menu_open: false, list_actions: ALL_LIST_ACTIONS, ...overrides })

describe('hotkeys', () => {
  test('every combo in the table resolves to its own binding, so no row shadows another', () => {
    for (const { action, scope, combos } of HOTKEYS) {
      for (const combo of combos) {
        const key = combo.shift === true && /^[a-z]$/.test(combo.key) ? combo.key.toUpperCase() : combo.key
        expect({ action, key, resolved: resolve_hotkey(press({ key, meta: combo.command === true, shift: combo.shift === true, list_actions: scope === 'player' ? NO_LIST_ACTIONS : ALL_LIST_ACTIONS })) })
          .toEqual({ action, key, resolved: action })
      }
    }
  })

  test('off a track list, f and . act on the playing track; m mutes everywhere', () => {
    expect(resolve_hotkey(press({ key: 'f', list_actions: NO_LIST_ACTIONS }))).toBe('adopt_playing')
    expect(resolve_hotkey(press({ key: '.', list_actions: NO_LIST_ACTIONS }))).toBe('open_playing_menu')
    expect(resolve_hotkey(press({ key: 'f' }))).toBe('adopt')
    expect(resolve_hotkey(press({ key: '.' }))).toBe('open_menu')
    expect(resolve_hotkey(press({ key: 'j', list_actions: NO_LIST_ACTIONS }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'm' }))).toBe('toggle_mute')
    expect(resolve_hotkey(press({ key: 'm', list_actions: NO_LIST_ACTIONS }))).toBe('toggle_mute')
  })

  test('the STYLE.md bindings', () => {
    const cases: Array<[Partial<KeyPress>, HotkeyAction]> = [
      [{ key: 'j' }, 'cursor_down'], [{ key: 'ArrowDown' }, 'cursor_down'], [{ key: 'k' }, 'cursor_up'],
      [{ key: 'J', shift: true }, 'extend_down'], [{ key: 'ArrowUp', shift: true }, 'extend_up'],
      [{ key: 'Home' }, 'cursor_first'], [{ key: 'End' }, 'cursor_last'], [{ key: 'x' }, 'toggle_selection'],
      [{ key: 'Enter' }, 'activate'], [{ key: 'e' }, 'rename_labels'], [{ key: 'Backspace' }, 'delete_labels'], [{ key: 'n' }, 'play_next'], [{ key: 'q' }, 'add_to_queue'],
      [{ key: 't' }, 'tag'], [{ key: 'f' }, 'adopt'], [{ key: 'i' }, 'toggle_inspector'],
      [{ key: '.' }, 'open_menu'], [{ key: 'F10', shift: true }, 'open_menu'],
      [{ key: '/' }, 'focus_search'], [{ key: 'f', meta: true }, 'focus_search'], [{ key: 'Escape' }, 'escape'],
      [{ key: ' ' }, 'toggle_playback'], [{ key: 'ArrowLeft', ctrl: true }, 'previous_track'], [{ key: 'ArrowRight', meta: true }, 'next_track'],
      [{ key: 'ArrowLeft', shift: true }, 'seek_back'], [{ key: 'ArrowRight', shift: true }, 'seek_forward'],
      [{ key: '-' }, 'volume_down'], [{ key: '=' }, 'volume_up'], [{ key: 'r' }, 'cycle_repeat'], [{ key: 's' }, 'toggle_shuffle'],
      [{ key: 'Q', shift: true }, 'toggle_queue'], [{ key: '[', meta: true }, 'back'], [{ key: ']', meta: true }, 'forward'],
      [{ key: 'g' }, 'lead'], [{ key: ',', meta: true }, 'go_settings'], [{ key: 'o', meta: true }, 'import_files'],
      [{ key: '?', shift: true, meta: true }, 'show_help'], [{ key: '/', shift: true, meta: true }, 'show_help'],
      [{ key: '?', shift: true }, 'show_shortcuts']
    ]
    for (const [overrides, action] of cases) expect([overrides, resolve_hotkey(press(overrides))]).toEqual([overrides, action])
  })

  test('nothing fires in a field, a dialog, or a menu, or with Alt; Esc still reaches the app from a field', () => {
    expect(resolve_hotkey(press({ key: 'j', in_field: true }))).toBeNull()
    expect(resolve_hotkey(press({ key: ' ', in_field: true }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'n', dialog_open: true }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'n', menu_open: true }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'j', alt: true }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'Escape', in_field: true }))).toBe('escape')
    expect(resolve_hotkey(press({ key: 'Escape', dialog_open: true }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'ArrowRight' }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'z' }))).toBeNull()
    for (const key of ['h', 'l', 'a', ',']) expect(resolve_hotkey(press({ key }))).toBeNull()
  })

  test('a list key the mounted list does not answer falls through to the player and app keys', () => {
    expect(resolve_hotkey(press({ key: 'f', list_actions: TAG_LIST_ACTIONS }))).toBe('adopt_playing')
    expect(resolve_hotkey(press({ key: 'e', list_actions: TAG_LIST_ACTIONS }))).toBe('rename_labels')
    expect(resolve_hotkey(press({ key: '.', list_actions: TAG_LIST_ACTIONS }))).toBe('open_menu')
    expect(resolve_hotkey(press({ key: 'n', list_actions: TAG_LIST_ACTIONS }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'Enter', list_actions: TAG_LIST_ACTIONS }))).toBe('activate')
  })

  test('the list keys are live only while a list is shown; the rest everywhere', () => {
    expect(resolve_hotkey(press({ key: 'j', list_actions: NO_LIST_ACTIONS }))).toBeNull()
    expect(resolve_hotkey(press({ key: 'Enter', list_actions: NO_LIST_ACTIONS }))).toBeNull()
    expect(resolve_hotkey(press({ key: ' ', list_actions: NO_LIST_ACTIONS }))).toBe('toggle_playback')
    expect(resolve_hotkey(press({ key: 'g', list_actions: NO_LIST_ACTIONS }))).toBe('lead')
  })

  test('after g, a letter goes to a page and a digit to a sidebar library', () => {
    expect(GO_KEYS.map(({ key }) => resolve_go(key))).toEqual(['tracks', 'listens', 'tags', 'library', 'libraries', 'import', 'identity', 'settings'])
    expect(resolve_go('#')).toBe('tags')
    expect(resolve_go('1')).toEqual({ library: 0 })
    expect(resolve_go('9')).toEqual({ library: 8 })
    expect(resolve_go('0')).toBeNull()
    expect(resolve_go('z')).toBeNull()
    expect(new Set(GO_KEYS.map(({ key }) => key)).size).toBe(GO_KEYS.length)
  })
})
