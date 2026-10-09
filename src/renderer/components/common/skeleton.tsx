// A loading bar (STYLE.md § Progressive Disclosure): 12px, pulsing with a
// staggered delay, no sweep. Skeleton rows place one per column of the
// layout they stand for. The hibernation snapshot usually makes them
// unnecessary; they cover a first launch.

import styles from './skeleton.module.css'

// A ragged width in [min, max] percent, fixed per row and column, so a
// column of bars reads as varied text rather than one repeating shape.
export const ragged_width = (row: number, column: number, min: number, max: number): number => {
  const hash = Math.abs(Math.imul(row + 1, 2654435761) ^ Math.imul(column + 1, 40503)) % 1000
  return min + (max - min) * hash / 1000
}

export const SkeletonBar = ({ width, row, align = 'start' }: { width: number, row: number, align?: 'start' | 'end' | undefined }) => (
  <span
    className={styles.bar}
    style={{ width: `${width}%`, marginLeft: align === 'end' ? 'auto' : undefined, animationDelay: `${(row % 6) * 0.12}s` }}
  />
)
