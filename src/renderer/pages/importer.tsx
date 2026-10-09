// Ingest (spec §8.9.1): files from main's picker or dropped here, a URL,
// or an existing track by content CID, into the library the target
// selector names (§8.6.3), with per-import progress from the import:*
// events. Dropped files go to main as bytes and a bare name; no
// path ever leaves the renderer (§8.10.3).

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useStore } from 'react-redux'
import { useSearchParams } from 'react-router'

import styles from './importer.module.css'
import { char_gauge, import_fraction } from '#renderer/components/common/char-gauge.ts'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { Screen } from '#renderer/components/common/screen.tsx'
import { is_cid } from '#renderer/components/library/cid.ts'
import { TargetSelect, use_write_target } from '#renderer/components/library/target-select.tsx'
import { target_fields, type WriteTarget } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { import_requested } from '#renderer/store/imports.ts'
import { use_app_dispatch, use_app_selector, type RootState } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'
import { report_write } from '#renderer/store/write.ts'
import type { ImportAck, NodeResult } from '#shared/bridge.ts'
import { URL_IMPORT_OFF_IN_BUNDLED } from '#shared/bundled.ts'

const is_web_url = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export const Importer = () => {
  const dispatch = use_app_dispatch()
  const store = useStore<RootState>()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const bundled = use_app_selector((state) => state.connection.config?.mode === 'bundled')
  const ingest_disabled = use_app_selector((state) => bundled ? state.bundled.state?.ingest_disabled ?? null : null)
  const imports = use_app_selector((state) => state.imports.items)
  const [url, set_url] = useState('')
  const [cid, set_cid] = useState('')
  const [dragging, set_dragging] = useState(false)
  const [uploading, set_uploading] = useState(false)
  const choice = use_write_target({ action: 'library.append_track' })
  const target = choice.target

  const track_import = (result: NodeResult<ImportAck | null>, label: string) => {
    if (!result.ok) {
      dispatch(notified({ kind: 'error', message: result.failure.message }))
      return
    }
    if (result.data === null) return
    dispatch(import_requested({ import_id: result.data.import_id, label, file_count: result.data.file_count ?? null }))
  }

  // Checked when the action runs, not only through the disabled buttons:
  // uploads go through their own channels, past the base query's gate.
  const writes_allowed_now = (): WriteTarget | null => {
    if (!select_writes_allowed(store.getState())) {
      dispatch(notified({ kind: 'error', message: 'Imports wait until the app has caught up with the node.' }))
      return null
    }
    if (target === null) dispatch(notified({ kind: 'error', message: 'There is no library to import into.' }))
    return target
  }

  const choose = async () => {
    const into = writes_allowed_now()
    if (into === null) return
    set_uploading(true)
    const result = await window.record.import.choose_files({ target: target_fields(into) })
    track_import(result, 'Chosen files')
    if (result.ok && result.data !== null) choice.used(into)
    set_uploading(false)
  }

  const drop = async (event: DragEvent) => {
    event.preventDefault()
    set_dragging(false)
    const into = writes_allowed_now()
    if (into === null) return
    const files = [...event.dataTransfer.files]
    if (files.length === 0) return
    set_uploading(true)
    // One file at a time: read it, send it, wait, and let it go, so at most
    // one file's bytes are held here and in main at once.
    for (const file of files) {
      const result = await window.record.import.upload_files({ files: [{ name: file.name, data: await file.arrayBuffer() }], target: target_fields(into) })
      track_import(result, file.name)
      if (result.ok) choice.used(into)
    }
    set_uploading(false)
  }

  const import_url = async (event: FormEvent) => {
    event.preventDefault()
    const source = url.trim()
    if (target === null) return
    const ack = await report_write<ImportAck>({ dispatch, write: dispatch(node_api.endpoints.import_url.initiate({ url: source, ...target_fields(target) })), success: null })
    if (ack === null) return
    choice.used(target)
    dispatch(import_requested({ import_id: ack.import_id, label: source, file_count: 1 }))
    set_url('')
  }

  const add_by_cid = async (event: FormEvent) => {
    event.preventDefault()
    if (target === null) return
    const added = await report_write({
      dispatch,
      write: dispatch(node_api.endpoints.add_track_by_cid.initiate({ content_cid: cid.trim(), ...target_fields(target) })),
      success: `Added to ${choice.name_of(target.library_address)}.`
    })
    if (added === null) return
    choice.used(target)
    set_cid('')
  }

  // Cmd+O lands here with ?pick=1: open the picker once the target is known.
  const [search, set_search] = useSearchParams()
  const picked = useRef(false)
  useEffect(() => {
    if (search.get('pick') !== '1' || picked.current || target === null) return
    picked.current = true
    set_search({}, { replace: true })
    choose().catch(() => { set_uploading(false) })
  })

  return (
    <section className={styles.page}>
      {!writes_allowed && <p className={styles.muted}>Imports wait until the app has caught up with the node.</p>}
      <div className={styles.row}><TargetSelect choice={choice} label='Import into' /></div>
      {ingest_disabled !== null && (
        <p className={styles.error} data-testid='ingest-disabled'>
          The bundled node cannot ingest files: {ingest_disabled}. Adding by CID still works.
        </p>
      )}
      <div
        className={dragging ? `${styles.drop} ${styles.dragging}` : styles.drop}
        data-testid='drop-zone'
        onDragOver={(event) => { event.preventDefault(); set_dragging(true) }}
        onDragLeave={() => { set_dragging(false) }}
        onDrop={(event) => { drop(event).catch((error: unknown) => { set_uploading(false); dispatch(notified({ kind: 'error', message: String(error) })) }) }}
      >
        <p className={styles.drop_text}>Drop audio files here</p>
        <button type='button' data-variant='primary' disabled={!writes_allowed || uploading || target === null} onClick={() => { choose().catch(() => { set_uploading(false) }) }}>
          {uploading ? 'Uploading' : 'Choose files or folders'}
        </button>
        <span className={styles.hint}>Cmd+O</span>
      </div>
      {bundled
        ? <p className={styles.muted} data-testid='url-import-off'>{URL_IMPORT_OFF_IN_BUNDLED}</p>
        : (
          <form className={styles.row} onSubmit={(event) => { import_url(event).catch(() => {}) }}>
            <input aria-label='Import from URL' placeholder='Paste a URL: https://...' spellCheck={false} value={url} onChange={(event) => { set_url(event.target.value) }} />
            <button type='submit' disabled={!writes_allowed || target === null || !is_web_url(url.trim())}>Import URL</button>
          </form>
          )}
      <FramedSection title='Add by CID' fold_id='import-cid' default_open={false}>
        <form className={styles.row} onSubmit={(event) => { add_by_cid(event).catch(() => {}) }}>
          <input aria-label='Add by content CID' placeholder='Content CID of a track already on the network' spellCheck={false} value={cid} onChange={(event) => { set_cid(event.target.value) }} />
          <button type='submit' disabled={!writes_allowed || target === null || !is_cid(cid.trim())}>Add track</button>
        </form>
      </FramedSection>
      {imports.length > 0 && (
        <Screen className={styles.progress} data-testid='import-progress'>
          <div className={styles.progress_body}>
            <p className='screen-label'>imports</p>
            <ul className={styles.imports}>
              {imports.map((item) => (
                <li key={item.import_id} className={item.finished ? styles.finished : undefined} data-testid='import-item' data-finished={item.finished}>
                  <span className={styles.line}>
                    <span className={styles.gauge}>{char_gauge(import_fraction(item))}</span>
                    <span className={styles.percent}>{item.finished ? 'done' : `${Math.round(import_fraction(item) * 100)}%`}</span>
                    <span className={styles.label}>{item.label}</span>
                    <span className={styles.status}>{item.completed}{item.file_count === null ? '' : `/${item.file_count}`}</span>
                  </span>
                  {item.added.length > 0 && <span className={styles.added}>added: {item.added.join(', ')}</span>}
                  {item.errors.map((error) => <span key={error} className={styles.error}>!! {error}</span>)}
                </li>
              ))}
            </ul>
          </div>
        </Screen>
      )}
    </section>
  )
}
