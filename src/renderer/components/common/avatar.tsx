// A library or identity avatar (STYLE.md § Artwork and avatars): square,
// falling back to the name's first letter in the display face, and blank
// when there is no name.

import styles from './avatar.module.css'
import { use_image } from './use-image.ts'

export const Avatar = ({ name, size, cid }: { name: string, size: number, cid?: string | null | undefined }) => {
  const url = use_image(cid)
  const letter = [...name.replace(/^\/record\//, '').trim()][0]?.toUpperCase() ?? ''
  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }} aria-hidden='true'>
      {url === null ? letter : <img src={url} alt='' draggable={false} />}
    </span>
  )
}
