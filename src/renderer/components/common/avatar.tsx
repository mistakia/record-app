// A library or identity avatar (STYLE.md § Artwork and avatars): square,
// falling back to the name's first letter in the display face, or, given a
// pattern and no name, to the identity's key pattern.

import styles from './avatar.module.css'
import { use_image } from './use-image.ts'

const KeyPattern = ({ cells }: { cells: readonly boolean[] }) => (
  <svg viewBox='0 0 5 5' width='60%' height='60%' shapeRendering='crispEdges' fill='currentColor'>
    {cells.map((on, index) => on && <rect key={index} x={index % 5} y={Math.floor(index / 5)} width='1' height='1' />)}
  </svg>
)

export const Avatar = ({ name, size, cid, pattern }: { name: string, size: number, cid?: string | null | undefined, pattern?: readonly boolean[] | undefined }) => {
  const url = use_image(cid)
  const letter = [...name.replace(/^\/record\//, '').trim()][0]?.toUpperCase()
  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }} aria-hidden='true'>
      {url !== null ? <img src={url} alt='' draggable={false} /> : letter ?? (pattern === undefined ? '' : <KeyPattern cells={pattern} />)}
    </span>
  )
}
