// Hairline icons for the transport controls the mono faces have no glyph
// for (STYLE.md § Glyphs): repeat, repeat one, shuffle, queue, history, the
// volume's speaker, and pause.
// 16px, a 1.25px square-capped stroke in currentColor, as crisp as the text
// glyphs beside them.

import type { ReactNode } from 'react'

const Icon = ({ children }: { children: ReactNode }) => (
  <svg width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='currentColor' strokeWidth='1.25' strokeLinecap='square' aria-hidden='true'>
    {children}
  </svg>
)

export const RepeatIcon = ({ one }: { one: boolean }) => (
  <Icon>
    <path d='M3 7V4.5h9.5M10.5 2.5l2 2-2 2M13 9v2.5H3.5M5.5 13.5l-2-2 2-2' />
    {one && <path d='M8 6.5v3' />}
  </Icon>
)

export const ShuffleIcon = () => (
  <Icon>
    <path d='M2.5 4.5h2.5l6 7h2.5M2.5 11.5h2.5l6-7h2.5M11.5 2.5l2 2-2 2M11.5 9.5l2 2-2 2' />
  </Icon>
)

export const QueueIcon = () => (
  <Icon>
    <path d='M2.5 4h8M2.5 8h8M2.5 12h5M10.5 10.5v3l2.5-1.5z' />
  </Icon>
)

export const HistoryIcon = () => (
  <Icon>
    <path d='M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v2.5H5M8 5v3.5l2 1.5' />
  </Icon>
)

// The volume's mute control: a speaker, with a slash through it while muted.
export const SpeakerIcon = ({ muted }: { muted: boolean }) => (
  <Icon>
    <path d='M2.5 6v4h2.5l3.5 3V3L5 6z' />
    {muted ? <path d='M2 2l12 12' /> : <path d='M10.5 6a2.5 2.5 0 0 1 0 4M12 4a5 5 0 0 1 0 8' />}
  </Icon>
)

// Pause: two solid bars, drawn because the face's ▮▮ is squat, no taller
// than ▶ and wider. Filled rather than stroked, to weigh what ▶ weighs, a
// little taller than it, and boxed tight to the bars so it centres where ▶
// does. In CSS pixels: bar and gap stay on half pixels, crisp at 2x.
export const PauseIcon = ({ height = 10, bar = 2.5, gap = 2 }: { height?: number, bar?: number, gap?: number }) => {
  const width = bar * 2 + gap
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill='currentColor' aria-hidden='true'>
      <path d={`M0 0h${bar}v${height}H0zM${bar + gap} 0h${bar}v${height}H${bar + gap}z`} />
    </svg>
  )
}
