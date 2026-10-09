// Track artwork (STYLE.md § Artwork and avatars): the image when the node
// serves it, else legacy-v0's vinyl disc, the one round shape on paper.

import styles from './artwork.module.css'
import { use_image } from './use-image.ts'

export const Artwork = ({ cid, size, testid }: { cid: string | null | undefined, size: number, testid?: string }) => {
  const url = use_image(cid)
  return (
    <span className={styles.artwork} style={{ width: size, height: size }} data-testid={testid} data-has-image={url === null ? undefined : ''}>
      {url === null
        ? <span className={styles.disc} aria-hidden='true'><span className={styles.label} /></span>
        : <img src={url} alt='' draggable={false} />}
    </span>
  )
}
