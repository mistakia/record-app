// A library or identity avatar (STYLE.md § Artwork and avatars): square, its
// image when it has one, and otherwise the pattern its library's address
// gives it.

import { avatar_pattern } from './avatar-pattern.ts'
import styles from './avatar.module.css'
import { use_image } from './use-image.ts'

const Pattern = ({ cells }: { cells: readonly boolean[] }) => (
  <svg viewBox='0 0 5 5' width='60%' height='60%' shapeRendering='crispEdges' fill='currentColor'>
    {cells.map((on, index) => on && <rect key={index} x={index % 5} y={Math.floor(index / 5)} width='1' height='1' />)}
  </svg>
)

export const Avatar = ({ address, size, cid }: { address: string, size: number, cid?: string | null | undefined }) => {
  const url = use_image(cid)
  return (
    <span className={styles.avatar} style={{ width: size, height: size }} aria-hidden='true' data-testid='avatar'>
      {url !== null ? <img src={url} alt='' draggable={false} /> : address === '' ? null : <Pattern cells={avatar_pattern(address)} />}
    </span>
  )
}
