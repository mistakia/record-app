// The corner relabel gauge (STYLE.md § Layout › Page column), in the ingest
// gauge's pattern: while a relabel runs, on every page, a small screen reads
// `relabelling 340/1200 [###-------]`, with `cancel` on the Tags page. When
// it ends it holds the outcome, `done 1200` or `!! 3 failed`, for about 4
// seconds, then goes; the toast carries the rest.

import { useEffect } from 'react'
import { useLocation } from 'react-router'

import styles from './relabel-gauge.module.css'
import { char_gauge } from '#renderer/components/common/char-gauge.ts'
import { Screen } from '#renderer/components/common/screen.tsx'
import gauge_styles from '#renderer/components/layout/ingest-gauge.module.css'
import { ROUTES } from '#renderer/routes.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { relabel_cancel_requested, relabel_dismissed, RUNNING, select_relabel } from '#renderer/store/relabel-job.ts'

const HOLD_MS = 4_000

export const RelabelGauge = () => {
  const dispatch = use_app_dispatch()
  const { pathname } = useLocation()
  const job = use_app_selector(select_relabel)
  const ended = job !== null && !RUNNING.has(job.status)
  useEffect(() => {
    if (!ended) return
    const timer = setTimeout(() => { dispatch(relabel_dismissed()) }, HOLD_MS)
    return () => { clearTimeout(timer) }
  }, [ended, dispatch])

  if (job === null) return null
  let text: string
  switch (job.status) {
    case 'collecting': text = 'relabel: collecting'; break
    case 'writing': text = `relabelling ${job.written}/${job.total} ${char_gauge(job.total === 0 ? 0 : job.written / job.total)}`; break
    case 'finished': text = job.failed_count > 0 ? `relabel !! ${job.failed_count} failed` : `relabel done ${job.updated}`; break
    default: text = `relabel !! ${job.status}`
  }
  return (
    <Screen className={gauge_styles.gauge} data-testid='relabel-gauge' data-state={ended ? 'ended' : 'running'}>
      <span className={gauge_styles.button}>{text}</span>
      {!ended && pathname === ROUTES.tags && (
        <button type='button' data-variant='glyph' className={styles.cancel} disabled={job.cancel_requested} onClick={() => { dispatch(relabel_cancel_requested()) }}> cancel</button>
      )}
    </Screen>
  )
}
