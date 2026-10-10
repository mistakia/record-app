// The identity surface (spec §8.5.7, §8.9.1): the profile the identity goes
// by, which is its default own library's (§8.6.9), who holds the key, the public
// key on request, the own libraries, the capabilities held from others, the
// last export, and export and import, behind a section index.

import { useState } from 'react'

import styles from './identity.module.css'
import { HeldCapabilities } from '#renderer/components/capability/held-capabilities.tsx'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { IndexedPage, type IndexedSection } from '#renderer/components/common/indexed-page.tsx'
import { ExportDialog } from '#renderer/components/identity/export-dialog.tsx'
import { ImportForm } from '#renderer/components/identity/import-form.tsx'
import { AboutEditor } from '#renderer/components/library/about-editor.tsx'
import { own_libraries_of, own_library_address, own_library_name } from '#renderer/components/library/library-category.ts'
import { key_handle } from '#renderer/identity/default-name.ts'
import { read_last_export, truncate_key } from '#renderer/identity/identity.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const Identity = () => {
  const config = use_app_selector((state) => state.connection.config)
  const own_libraries = node_api.endpoints.get_own_libraries.useQuery()
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const [key_shown, set_key_shown] = useState(false)
  const [exporting, set_exporting] = useState(false)
  const [, set_export_count] = useState(0)
  const node_url = config?.node_url ?? ''
  const node_key = config?.node_key ?? ''
  const mode = config?.mode ?? 'remote'
  const last_export = read_last_export(node_key)
  const own = own_libraries_of({ own: own_libraries.data, libraries: libraries.data })
  const profile_address = own_library_address(own)
  const public_key_query = node_api.endpoints.get_public_key.useQuery()
  const public_key = public_key_query.data
  const handle = public_key === undefined ? undefined : key_handle(public_key)
  const key_error = public_key_query.error !== undefined && 'message' in public_key_query.error ? String(public_key_query.error.message) : null

  const held = node_api.endpoints.get_held_capabilities.useQuery()
  const own_addresses = new Set(own.map(({ address }) => address))
  const held_count = held.data?.filter(({ library_address }) => !own_addresses.has(library_address)).length

  const sections: IndexedSection[] = [
    ...(profile_address === null
      ? []
      : [{
          id: 'profile',
          title: 'Profile',
          node: (
            <FramedSection title='Profile' testid='identity-profile'>
              <AboutEditor
                key={profile_address}
                address={profile_address}
                note={`The name and avatar you go by. They are your default library’s profile, so peers who link it see them too.${handle === undefined ? '' : ` Until you name yourself, you go by ${handle}, from your key.`}`}
                default_name={handle}
              />
            </FramedSection>
          )
        }]),
    {
      id: 'identity',
      title: 'Identity',
      node: (
        <FramedSection title='Identity' testid='identity-section'>
          <dl className={styles.facts}>
            <dt>Key held by</dt>
            <dd data-testid='key-holder'>
              {mode === 'bundled'
                ? 'This device'
                : `The node at ${node_url}. Whoever operates that node controls this identity.`}
            </dd>
            <dt>Public key</dt>
            <dd>
              {key_shown && public_key !== undefined
                ? <span data-testid='public-key'>{truncate_key(public_key)} <code className={styles.full}>{public_key}</code></span>
                : <button type='button' data-size='small' disabled={public_key === undefined} onClick={() => { set_key_shown(true) }}>Show public key</button>}
              {key_error !== null && <span className={styles.error}>!! {key_error}</span>}
            </dd>
            <dt>Own libraries</dt>
            <dd>{own.length === 0
              ? 'None'
              : own.map((library) => (
                <span key={library.id} className={styles.library} data-testid='identity-own-library'>
                  {own_library_name(library)}
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
        </FramedSection>
      )
    },
    {
      id: 'held',
      title: 'Capabilities held',
      fold_id: 'identity-held',
      node: (
        <FramedSection title='Capabilities held' fold_id='identity-held' default_open={false} count={held_count}>
          <HeldCapabilities />
        </FramedSection>
      )
    },
    {
      id: 'import',
      title: 'Import',
      fold_id: 'identity-import',
      node: (
        <FramedSection title='Import' fold_id='identity-import' default_open={false}>
          <ImportForm mode={mode} />
        </FramedSection>
      )
    }
  ]

  return (
    <>
      <IndexedPage prefix='identity' sections={sections} />
      {exporting && <ExportDialog node_key={node_key} on_close={() => { set_exporting(false); set_export_count((count) => count + 1) }} />}
    </>
  )
}
