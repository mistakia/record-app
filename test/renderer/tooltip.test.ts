import { describe, expect, test } from 'bun:test'

import { hotkey_text, place_tip, show_delay, tip, TIP_DELAY_MS } from '#renderer/components/common/tooltip-logic.ts'

const viewport = { width: 1000, height: 800 }
const tip_size = { width: 80, height: 18 }

describe('tooltip', () => {
  test('a hover waits, unless a tip was just up', () => {
    expect(show_delay({ now: 1000, warm_until: 0 })).toBe(TIP_DELAY_MS)
    expect(show_delay({ now: 1000, warm_until: 1200 })).toBe(0)
    expect(show_delay({ now: 1200, warm_until: 1200 })).toBe(TIP_DELAY_MS)
  })

  test('sits under the control, centred on it', () => {
    expect(place_tip({ anchor: { left: 100, top: 100, width: 20, height: 20 }, tip: tip_size, viewport }))
      .toEqual({ left: 70, top: 124, side: 'below' })
  })

  test('flips above when below would leave the window', () => {
    expect(place_tip({ anchor: { left: 100, top: 770, width: 20, height: 20 }, tip: tip_size, viewport }))
      .toEqual({ left: 70, top: 748, side: 'above' })
  })

  test('opens above a control in the bottom quarter of the window, the player bar', () => {
    expect(place_tip({ anchor: { left: 100, top: 700, width: 20, height: 20 }, tip: tip_size, viewport }))
      .toEqual({ left: 70, top: 678, side: 'above' })
    expect(place_tip({ anchor: { left: 100, top: 560, width: 20, height: 20 }, tip: tip_size, viewport }).side).toBe('below')
  })

  test('stays below when neither side fits, rather than leave the top', () => {
    expect(place_tip({ anchor: { left: 100, top: 2, width: 20, height: 20 }, tip: tip_size, viewport: { width: 1000, height: 30 } }).side).toBe('below')
  })

  test('is held inside the window sideways', () => {
    expect(place_tip({ anchor: { left: 0, top: 100, width: 10, height: 10 }, tip: tip_size, viewport }).left).toBe(4)
    expect(place_tip({ anchor: { left: 990, top: 100, width: 10, height: 10 }, tip: tip_size, viewport }).left).toBe(1000 - 4 - 80)
  })

  test('names the key from HOTKEYS, the first alternative, only where it is live', () => {
    expect(hotkey_text('toggle_playback', true)).toBe('Space')
    expect(hotkey_text('open_menu', true)).toBe('.')
    expect(hotkey_text('previous_track', false)).toBe('Cmd+←')
    expect(hotkey_text('go_settings', false)).toBe('Cmd+,')
    expect(hotkey_text('adopt', false)).toBeNull()
    expect(hotkey_text('adopt_playing', true)).toBeNull()
    expect(hotkey_text('adopt_playing', false)).toBe('f')
  })

  test('tip() sets the label, and the hotkey only when there is one', () => {
    expect(tip('Settings')).toEqual({ 'data-tip': 'Settings' })
    expect(tip('Play queue', 'toggle_queue')).toEqual({ 'data-tip': 'Play queue', 'data-tip-hotkey': 'toggle_queue' })
  })
})
