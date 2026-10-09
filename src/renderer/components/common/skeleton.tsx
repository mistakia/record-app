// Loading rows that mirror the layout (STYLE.md § Progressive Disclosure):
// 12px bars at ragged widths, pulsing with staggered delays, no sweep. The
// hibernation snapshot usually makes them unnecessary; they cover a first
// launch.

import styles from './skeleton.module.css'

const WIDTHS = [30, 58, 84]

export const SkeletonBar = ({ index }: { index: number }) => (
  <span className={styles.bar} style={{ width: `${WIDTHS[index % WIDTHS.length] ?? 58}%`, animationDelay: `${(index % 6) * 0.12}s` }} />
)

export const Skeleton = ({ rows = 8 }: { rows?: number }) => (
  <div className={styles.skeleton} aria-busy='true' aria-label='Loading' data-testid='skeleton'>
    {Array.from({ length: rows }, (_, index) => <div key={index} className={styles.row}><SkeletonBar index={index} /></div>)}
  </div>
)
