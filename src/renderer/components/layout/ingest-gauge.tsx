// The corner ingest gauge (STYLE.md § Layout › Page column): while an import
// runs and Import is not the page, a small screen in the page column's
// bottom-right corner shows the batch, `importing 3/10 [####------]`, and
// opens Import on click. A batch is every import seen running since the
// gauge was last empty; when it ends away from Import the gauge holds its
// outcome, `done 10` or `!! 1 failed`, for a few seconds, then goes.

import { useEffect, useState } from 'react'
import { shallowEqual } from 'react-redux'
import { useLocation, useNavigate } from 'react-router'

import styles from './ingest-gauge.module.css'
import { char_gauge } from '#renderer/components/common/char-gauge.ts'
import { Screen } from '#renderer/components/common/screen.tsx'
import { ROUTES } from '#renderer/routes.ts'
import type { ImportProgress } from '#renderer/store/imports.ts'
import { use_app_selector } from '#renderer/store/index.ts'

const HOLD_MS = 4_000
const NONE: ReadonlySet<string> = new Set()

const totals = (items: readonly ImportProgress[]) => {
  let done = 0
  let total = 0
  let added = 0
  let failed = 0
  for (const { completed, errors, file_count, finished } of items) {
    done += completed + errors.length
    total += finished ? completed + errors.length : file_count ?? 1
    added += completed
    failed += errors.length
  }
  return { done, total: Math.max(total, done), added, failed }
}

export const IngestGauge = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [batch, set_batch] = useState(NONE)
  // shallowEqual: filter returns a new array on every store update.
  const items = use_app_selector((state) => state.imports.items.filter(({ import_id, finished }) => !finished || batch.has(import_id)), shallowEqual)
  const running = items.filter(({ finished }) => !finished)
  const running_ids = running.map(({ import_id }) => import_id).join('\n')

  // Grow the batch while imports run; once none do, hold, then empty it.
  // A batch that ends on Import was seen there, so it is not held.
  const on_import = pathname === ROUTES.import
  useEffect(() => {
    if (running_ids !== '') {
      const ids = running_ids.split('\n')
      if (ids.some((id) => !batch.has(id))) set_batch(new Set([...batch, ...ids]))
      return
    }
    if (batch.size === 0) return
    if (on_import) {
      set_batch(NONE)
      return
    }
    const timer = setTimeout(() => { set_batch(NONE) }, HOLD_MS)
    return () => { clearTimeout(timer) }
  }, [running_ids, batch, on_import])

  if (items.length === 0 || on_import) return null
  const { done, total, added, failed } = totals(items)
  const ended = running.length === 0
  const text = ended
    ? failed > 0 ? `!! ${failed} failed` : `done ${added}`
    : `importing ${done}/${total} ${char_gauge(total === 0 ? 0 : done / total)}`
  const label = ended
    ? `Import finished: ${added} added${failed > 0 ? `, ${failed} failed` : ''}; open Import`
    : `Importing ${done} of ${total}; open Import`
  return (
    <Screen className={styles.gauge} data-testid='ingest-gauge' data-state={ended ? 'ended' : 'running'}>
      <button type='button' data-variant='glyph' className={styles.button} onClick={() => { navigate(ROUTES.import) }} aria-label={label}>
        {text}
      </button>
    </Screen>
  )
}
