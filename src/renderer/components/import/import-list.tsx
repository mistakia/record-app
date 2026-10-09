// The Import page's progress (STYLE.md § Import): unfinished imports on a
// screen, one line each, and the finished ones below as a paper history,
// newest first, each opening onto its added tracks and errors.

import { useEffect, useId, useState } from 'react'

import styles from './import-list.module.css'
import { import_fraction } from '#renderer/components/common/char-gauge.ts'
import { format_age } from '#renderer/components/common/format-age.ts'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { Screen } from '#renderer/components/common/screen.tsx'
import { error_line, finished_imports_cleared, type ImportProgress } from '#renderer/store/imports.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'

const PREVIEW = 10

// The clock the age column reads: every second while an import runs, else
// every 30 seconds.
const use_now = (interval_ms: number): number => {
  const [now, set_now] = useState(Date.now())
  useEffect(() => {
    set_now(Date.now())
    const timer = setInterval(() => { set_now(Date.now()) }, interval_ms)
    return () => { clearInterval(timer) }
  }, [interval_ms])
  return now
}

const failed = (item: ImportProgress): string => `!! ${item.errors.length} failed`

const RunningImports = ({ items, now }: { items: readonly ImportProgress[], now: number }) => (
  <Screen className={styles.screen} data-testid='import-progress'>
    <p className='screen-label'>importing</p>
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.import_id} className={styles.line} data-testid='import-item' data-finished={false}>
          <span className={styles.status}>{item.errors.length > 0 ? failed(item) : `${Math.round(import_fraction(item) * 100)}%`}</span>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.number}>{item.settled}{item.file_count === null ? '' : `/${item.file_count}`}</span>
          <span className={styles.number}>{format_age(now - item.started_at)}</span>
        </li>
      ))}
    </ul>
  </Screen>
)

const tracks = (count: number): string => `${count} ${count === 1 ? 'track' : 'tracks'}`

const HistoryRow = ({ item, now }: { item: ImportProgress, now: number }) => {
  const [open, set_open] = useState(false)
  const [all, set_all] = useState(false)
  const body_id = useId()
  const has_detail = item.added.length > 0 || item.errors.length > 0
  const shown = all ? item.added : item.added.slice(0, PREVIEW)
  const cells = (
    <>
      <span className={styles.chevron} aria-hidden='true'>{has_detail ? '▶' : ''}</span>
      <span className={item.errors.length > 0 ? styles.failed : styles.done}>{item.errors.length > 0 ? failed(item) : 'done'}</span>
      <span className={styles.label}>{item.label}</span>
      <span className={styles.number}>{tracks(item.added.length)}</span>
      <span className={styles.number}>{format_age(now - (item.finished_at ?? item.started_at))}</span>
    </>
  )
  return (
    <li className={styles.entry} data-testid='import-item' data-finished>
      {has_detail
        ? <button type='button' className={styles.row} aria-expanded={open} aria-controls={body_id} onClick={() => { set_open(!open) }}>{cells}</button>
        : <div className={styles.row}>{cells}</div>}
      {open && (
        <div id={body_id} className={styles.detail}>
          {item.errors.map((error) => <span key={error.position} className={styles.error}>!! {error_line(item, error)}</span>)}
          {shown.map((title, index) => <span key={index} className={styles.added}>{title}</span>)}
          {item.added.length > shown.length && (
            <button type='button' className={styles.more} onClick={() => { set_all(true) }}>show {item.added.length - shown.length} more</button>
          )}
        </div>
      )}
    </li>
  )
}

export const ImportList = ({ items }: { items: readonly ImportProgress[] }) => {
  const dispatch = use_app_dispatch()
  const running = items.filter(({ finished }) => !finished)
  const finished = items.filter(({ finished }) => finished).sort((a, b) => (b.finished_at ?? 0) - (a.finished_at ?? 0))
  const now = use_now(running.length > 0 ? 1_000 : 30_000)
  return (
    <>
      {running.length > 0 && <RunningImports items={running} now={now} />}
      {finished.length > 0 && (
        <FramedSection
          title='History'
          count={finished.length}
          testid='import-history'
          controls={<button type='button' aria-label='Clear finished imports' onClick={() => { dispatch(finished_imports_cleared()) }}>[clear]</button>}
        >
          <ul className={styles.history}>
            {finished.map((item) => <HistoryRow key={item.import_id} item={item} now={now} />)}
          </ul>
        </FramedSection>
      )}
    </>
  )
}
