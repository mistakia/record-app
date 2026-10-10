// A library or identity avatar (STYLE.md § Artwork and avatars): square, its
// image when it has one, and otherwise the pattern its library's address
// gives it.

import { avatar_pattern } from './avatar-pattern.ts'
import styles from './avatar.module.css'
import { use_image } from './use-image.ts'

// The pattern in whole pixels: each cell the nearest whole number to 60% of
// the square over five, and a 1px nudge when the leftover inside the 1px
// border is odd, so it centres on a pixel. Fractional cells blur at 20px.
export const pattern_cell = (size: number): number => Math.max(1, Math.round(size * 0.6 / 5))

const Pattern = ({ cells, size }: { cells: readonly boolean[], size: number }) => {
  const side = pattern_cell(size) * 5
  const nudge = (size - 2 - side) % 2 === 0 ? 0 : 1
  return (
    <svg viewBox='0 0 5 5' width={side} height={side} style={{ marginRight: nudge, marginBottom: nudge }} shapeRendering='crispEdges' fill='currentColor'>
      {cells.map((on, index) => on && <rect key={index} x={index % 5} y={Math.floor(index / 5)} width='1' height='1' />)}
    </svg>
  )
}

export const Avatar = ({ address, size, cid }: { address: string, size: number, cid?: string | null | undefined }) => {
  const url = use_image(cid)
  return (
    <span className={styles.avatar} style={{ width: size, height: size }} aria-hidden='true' data-testid='avatar'>
      {url !== null ? <img src={url} alt='' draggable={false} /> : address === '' ? null : <Pattern cells={avatar_pattern(address)} size={size} />}
    </span>
  )
}
