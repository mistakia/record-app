// The inline adder's write target as one quiet line, `into <library>`, with
// `change` when more than one library would take the tag; `change` opens the
// choice as a short list in place. The rule and the default are
// use_write_target's (spec §8.6.3, §8.6.7); only the presentation is compact.

import { useState } from 'react'

import styles from './tag-editor.module.css'
import type { WriteTargetChoice } from '#renderer/components/library/target-select.tsx'
import type { WriteTarget } from '#renderer/library/write-targets.ts'

export const TagTarget = ({ choice, on_chosen }: { choice: WriteTargetChoice, on_chosen: () => void }) => {
  const { targets, target, resolution, choose, name_of } = choice
  const [open, set_open] = useState(false)
  if (resolution.kind === 'loading') return <p className={styles.target} data-testid='write-target'>finding your libraries</p>
  const describe = (candidate: WriteTarget): string => `${name_of(candidate.library_address)}${candidate.category === 'shared' ? ' (shared)' : ''}`
  const listed = open || target === null
  return (
    <>
      <p className={styles.target} data-testid='write-target' data-library={target?.library_address ?? ''}>
        into <span className={styles.library}>{target === null ? '—' : describe(target)}</span>
        {targets.length > 1 && target !== null && (
          <>
            {' · '}
            <button type='button' data-variant='glyph' aria-expanded={open} aria-label='Change target library' onClick={() => { set_open(!open) }}>change</button>
          </>
        )}
      </p>
      {resolution.kind === 'chosen_gone' && <p className={styles.gone} role='alert'>You can no longer write to {name_of(resolution.library_address)}. Choose another library.</p>}
      {listed && targets.length > 1 && (
        <ul className={styles.targets} aria-label='Target library'>
          {targets.map((candidate) => {
            const current = candidate.library_address === target?.library_address
            return (
              <li key={candidate.library_address}>
                <button
                  type='button'
                  data-variant='glyph'
                  aria-current={current}
                  onClick={() => { choose(candidate.library_address); set_open(false); on_chosen() }}
                >
                  <span className={styles.mark} aria-hidden>{current ? '●' : ''}</span>{describe(candidate)}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
