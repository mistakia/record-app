// The identity surface (spec §8.5.7): who holds the key, the public key on
// request, the own libraries, the last export, and export and import.

import { useState } from 'react'

import styles from './identity.module.css'
import { ExportDialog } from '#renderer/components/identity/export-dialog.tsx'
import { ImportForm } from '#renderer/components/identity/import-form.tsx'
import { library_name, own_libraries_of } from '#renderer/components/library/library-category.ts'
import { compressed_public_key, read_last_export, truncate_key } from '#renderer/identity/identity.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const Identity = () => {
  const config = use_app_selector((state) => state.connection.config)
  const own_libraries = node_api.endpoints.get_own_libraries.useQuery()
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const [public_key, set_public_key] = useState<string | null>(null)
  const [key_error, set_key_error] = useState<string | null>(null)
  const [exporting, set_exporting] = useState(false)
  const [, set_export_count] = useState(0)
  const node_url = config?.node_url ?? ''
  const node_key = config?.node_key ?? ''
  const mode = config?.mode ?? 'remote'
  const last_export = read_last_export(node_key)
  const own = own_libraries_of({ own: own_libraries.data, libraries: libraries.data })

  // Chapter 7 serves the public key only together with the private key, so
  // it is read on request, in main, which passes on the public half alone.
  const show_public_key = async () => {
    const result = await window.record.identity.public_key()
    if (result.ok) set_public_key(compressed_public_key(result.data.public_key))
    else set_key_error(result.failure.message)
  }

  return (
    <section className={styles.page}>
      <h1>Identity</h1>
      <dl className={styles.facts}>
        <dt>Key held by</dt>
        <dd data-testid='key-holder'>
          {mode === 'bundled'
            ? 'This device'
            : `The node at ${node_url}. Whoever operates that node controls this identity.`}
        </dd>
        <dt>Public key</dt>
        <dd>
          {public_key === null
            ? <button type='button' onClick={() => { show_public_key().catch(() => {}) }}>Show public key</button>
            : <span title={public_key} data-testid='public-key'>{truncate_key(public_key)} <code className={styles.full}>{public_key}</code></span>}
          {key_error !== null && <span className={styles.error}>{key_error}</span>}
        </dd>
        <dt>Own libraries</dt>
        <dd>{own.length === 0
          ? 'None'
          : own.map((library) => (
            <span key={library.id} className={styles.library} data-testid='identity-own-library'>
              {library_name(library)}
              {library.library_type === 'listens' && ' (listens)'}
              {library.is_retired && ' (retired)'}
            </span>
          ))}
        </dd>
        <dt>Last export</dt>
        <dd data-testid='last-export'>{last_export === null ? 'Never from this app' : new Date(last_export).toLocaleString()}</dd>
      </dl>
      <div>
        <button type='button' onClick={() => { set_exporting(true) }}>Export identity</button>
      </div>
      <h2>Import</h2>
      <ImportForm mode={mode} />
      {exporting && <ExportDialog node_key={node_key} on_close={() => { set_exporting(false); set_export_count((count) => count + 1) }} />}
    </section>
  )
}
