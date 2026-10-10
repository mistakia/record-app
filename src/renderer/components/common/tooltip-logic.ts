// The pure half of the tooltip layer (STYLE.md § Tooltips): when a tip
// shows, where it sits, and the shortcut it names. A control opts in with
// tip(), which sets data-tip and, for a control a key also reaches,
// data-tip-hotkey; the layer reads both when it shows the tip.

import { HOTKEYS, type HotkeyAction } from '#renderer/hooks/hotkeys.ts'

// A hover waits this long before the tip shows...
export const TIP_DELAY_MS = 400
// ...unless a tip was up this recently, so moving along a row of controls
// reads each one without waiting again.
export const TIP_WARM_MS = 300

export const show_delay = ({ now, warm_until }: { now: number, warm_until: number }): number =>
  now < warm_until ? 0 : TIP_DELAY_MS

export interface Box { left: number, top: number, width: number, height: number }

const GAP = 4
const MARGIN = 4

// Centred on the control, under it, or above it when the control sits in
// the bottom quarter of the window (the player bar), so a tip never covers
// the control's own neighbours below the fold; on the other side when the
// preferred one would leave the window; held inside the window sideways.
export const LOW_FRACTION = 0.75

export const place_tip = ({ anchor, tip, viewport }: {
  anchor: Box
  tip: { width: number, height: number }
  viewport: { width: number, height: number }
}): { left: number, top: number, side: 'below' | 'above' } => {
  const below = anchor.top + anchor.height + GAP
  const above = anchor.top - GAP - tip.height
  const fits_below = below + tip.height <= viewport.height - MARGIN
  const fits_above = above >= MARGIN
  const prefers_above = anchor.top + anchor.height / 2 > viewport.height * LOW_FRACTION
  const side = prefers_above
    ? fits_above || !fits_below ? 'above' : 'below'
    : fits_below || !fits_above ? 'below' : 'above'
  const centred = anchor.left + anchor.width / 2 - tip.width / 2
  const left = Math.max(MARGIN, Math.min(centred, viewport.width - MARGIN - tip.width))
  return { left: Math.round(left), top: Math.round(side === 'below' ? below : above), side }
}

// The keys a tip names for an action, as HOTKEYS shows them (the first of
// its alternatives), or null when the key is not live here: a track list's
// keys need a list mounted, the playing track's keys need none.
export const hotkey_text = (action: HotkeyAction, list_shown: boolean): string | null => {
  const hotkey = HOTKEYS.find((entry) => entry.action === action)
  if (hotkey === undefined) return null
  if (hotkey.scope === 'list' && !list_shown) return null
  if (hotkey.scope === 'player' && list_shown) return null
  return hotkey.keys.split(' or ')[0] ?? null
}

// The attributes a tipped control carries, spread onto it.
export const tip = (label: string, hotkey?: HotkeyAction): { 'data-tip': string, 'data-tip-hotkey'?: HotkeyAction } =>
  hotkey === undefined ? { 'data-tip': label } : { 'data-tip': label, 'data-tip-hotkey': hotkey }
