// Ingest (spec §8.9.1): files from main's picker or dropped here, a URL,
// or an existing track by content CID, with per-import progress from the
// import:* events. Dropped files go to main as bytes and a bare name; no
// path ever leaves the renderer (§8.10.3).

import { useState, type DragEvent, type FormEvent } from 'react'
import { useStore } from 'react-redux'

import styles from './importer.module.css'
import { is_cid } from '#renderer/components/library/cid.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { import_requested } from '#renderer/store/imports.ts'
import { use_app_dispatch, use_app_selector, type RootState } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'
import { report_write } from '#renderer/store/write.ts'
import type { ImportAck, NodeResult } from '#shared/bridge.ts'

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
  const imports = use_app_selector((state) => state.imports.items)
  const [url, set_url] = useState('')
  const [cid, set_cid] = useState('')
  const [dragging, set_dragging] = useState(false)
  const [uploading, set_uploading] = useState(false)

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
  const writes_allowed_now = (): boolean => {
    if (select_writes_allowed(store.getState())) return true
    dispatch(notified({ kind: 'error', message: 'Imports wait until the app has caught up with the node.' }))
    return false
  }

  const choose = async () => {
    if (!writes_allowed_now()) return
    set_uploading(true)
    track_import(await window.record.import.choose_files(), 'Chosen files')
    set_uploading(false)
  }

  const drop = async (event: DragEvent) => {
    event.preventDefault()
    set_dragging(false)
    if (!writes_allowed_now()) return
    const files = [...event.dataTransfer.files]
    if (files.length === 0) return
    set_uploading(true)
    // One file at a time: read it, send it, wait, and let it go, so at most
    // one file's bytes are held here and in main at once.
    for (const file of files) {
      track_import(await window.record.import.upload_files([{ name: file.name, data: await file.arrayBuffer() }]), file.name)
    }
    set_uploading(false)
  }

  const import_url = async (event: FormEvent) => {
    event.preventDefault()
    const target = url.trim()
    const ack = await report_write<ImportAck>({ dispatch, write: dispatch(node_api.endpoints.import_url.initiate({ url: target })), success: null })
    if (ack === null) return
    dispatch(import_requested({ import_id: ack.import_id, label: target, file_count: 1 }))
    set_url('')
  }

  const add_by_cid = async (event: FormEvent) => {
    event.preventDefault()
    const added = await report_write({ dispatch, write: dispatch(node_api.endpoints.add_track_by_cid.initiate({ content_cid: cid.trim() })), success: 'Added to your library.' })
    if (added !== null) set_cid('')
  }

  return (
    <section className={styles.page}>
      <h1>Import</h1>
      {!writes_allowed && <p className={styles.muted}>Imports are paused until the app has caught up with the node.</p>}
      <div
        className={dragging ? `${styles.drop} ${styles.dragging}` : styles.drop}
        data-testid='drop-zone'
        onDragOver={(event) => { event.preventDefault(); set_dragging(true) }}
        onDragLeave={() => { set_dragging(false) }}
        onDrop={(event) => { drop(event).catch((error: unknown) => { set_uploading(false); dispatch(notified({ kind: 'error', message: String(error) })) }) }}
      >
        <p>Drop audio files here, or</p>
        <button type='button' disabled={!writes_allowed || uploading} onClick={() => { choose().catch(() => { set_uploading(false) }) }}>
          {uploading ? 'Uploading' : 'Choose files'}
        </button>
      </div>
      <form className={styles.row} onSubmit={(event) => { import_url(event).catch(() => {}) }}>
        <input aria-label='Import from URL' placeholder='https://...' spellCheck={false} value={url} onChange={(event) => { set_url(event.target.value) }} />
        <button type='submit' disabled={!writes_allowed || !is_web_url(url.trim())}>Import URL</button>
      </form>
      <form className={styles.row} onSubmit={(event) => { add_by_cid(event).catch(() => {}) }}>
        <input aria-label='Add by content CID' placeholder='Content CID of a track already on the network' spellCheck={false} value={cid} onChange={(event) => { set_cid(event.target.value) }} />
        <button type='submit' disabled={!writes_allowed || !is_cid(cid.trim())}>Add track</button>
      </form>
      <h2>Progress</h2>
      {imports.length === 0 && <p className={styles.muted}>No imports yet.</p>}
      <ul className={styles.imports}>
        {imports.map((item) => (
          <li key={item.import_id} data-testid='import-item' data-finished={item.finished}>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.status}>
              {item.finished ? 'Done' : 'Importing'}: {item.completed}{item.file_count === null ? '' : ` of ${item.file_count}`} processed
              {item.errors.length > 0 && `, ${item.errors.length} failed`}
            </span>
            {item.added.length > 0 && <span className={styles.added}>Added: {item.added.join(', ')}</span>}
            {item.errors.map((error) => <span key={error} className={styles.error}>{error}</span>)}
          </li>
        ))}
      </ul>
    </section>
  )
}
