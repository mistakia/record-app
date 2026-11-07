// Labels that differ only in case or spacing (tag-collisions.ts), above
// the index in one framed section, each group offering a merge into its
// most-used member. Nothing renders when there are none.

import styles from './tag-collision-section.module.css'
import type { TagCollision } from './tag-collisions.ts'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'

export const TagCollisionSection = ({ collisions, on_merge }: { collisions: readonly TagCollision[], on_merge: (collision: TagCollision) => void }) => {
  if (collisions.length === 0) return null
  return (
    <div className={styles.wrap}>
      <FramedSection title='Near duplicates' fold_id='tags-collisions' count={collisions.length} width='full' testid='tag-collisions'>
        <ul className={styles.list}>
          {collisions.map((collision) => {
            const [target] = collision.members
            return (
              <li key={target!.tag} className={styles.group}>
                <span className={styles.members}>
                  {collision.members.map(({ tag, count }) => <span key={tag}><code>{JSON.stringify(tag)}</code> <span className={styles.count}>{count}</span></span>)}
                </span>
                <button type='button' data-size='small' onClick={() => { on_merge(collision) }}>
                  merge into <span className={styles.exact}>{JSON.stringify(target!.tag)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </FramedSection>
    </div>
  )
}
