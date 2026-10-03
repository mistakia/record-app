// Own-library management (spec §8.6.1, §8.9.1, §4.8.3): every library the
// identity owns, active and retired, from GET /identity/libraries; creating
// one with an optional name and discriminator; retiring one, which is
// permanent; and choosing which own library's profile to edit. The listens
// library is where listens go, so it is marked and never offered for
// retirement. A node without the endpoint (404) keeps only the profile
// editor for its own library (§8.7.6).

import { useState, type FormEvent } from 'react'

import styles from './own-libraries.module.css'
import type { Library } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { AboutEditor } from './about-editor.tsx'
import { can_retire, has_profile, library_name, own_libraries_of, own_library_address } from './library-category.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

const DISCRIMINATOR = /^[0-9a-zA-Z-]{1,64}$/

const is_not_found = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === 404

const OwnLibraryRow = ({ library, editing, on_edit, on_retire }: {
  library: Library
  editing: boolean
  on_edit: () => void
  on_retire: () => void
}) => {
  const writes_allowed = use_app_selector(select_writes_allowed)
  return (
    <tr data-testid='own-library-row' data-retired={library.is_retired} data-type={library.library_type}>
      <td>
        <span className={styles.name}>{library.alias ?? library.name ?? (library.library_type === 'listens' ? 'Listens' : 'Unnamed library')}</span>
        <span className={styles.address}>{library.address}</span>
      </td>
      <td>
        {library.library_type === 'listens' && <span className={styles.badge} title='Listens are recorded here'>listens</span>}
        {library.is_retired && <span className={`${styles.badge} ${styles.retired}`}>retired</span>}
        {library.library_type !== 'listens' && library.library_type !== 'recordstore' && <span className={styles.badge}>{library.library_type}</span>}
      </td>
      <td>{library.track_count}</td>
      <td className={styles.actions}>
        {has_profile(library) && <button type='button' aria-pressed={editing} onClick={on_edit}>Profile</button>}
        {can_retire(library) && <button type='button' disabled={!writes_allowed} onClick={on_retire}>Retire</button>}
      </td>
    </tr>
  )
}

export const OwnLibraries = () => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const own = node_api.endpoints.get_own_libraries.useQuery()
  const all = node_api.endpoints.get_libraries.useQuery()
  const [name, set_name] = useState('')
  const [discriminator, set_discriminator] = useState('')
  const [creating, set_creating] = useState(false)
  const [retiring, set_retiring] = useState<Library | null>(null)
  const [editing, set_editing] = useState<string | null>(null)

  if (is_not_found(own.error)) {
    const address = own_library_address(all.data)
    return address === null ? null : <AboutEditor address={address} />
  }
  const libraries = own_libraries_of({ own: own.data, libraries: all.data })
  // The profile shown: the one chosen, while it can still be edited, or the
  // default own library.
  const chosen = libraries.find(({ address }) => address === editing)
  const profile_address = chosen !== undefined && has_profile(chosen) ? chosen.address : own_library_address(libraries)
  const discriminator_valid = discriminator.trim() === '' || DISCRIMINATOR.test(discriminator.trim())

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!discriminator_valid) return
    set_creating(true)
    const created = await report_write<Library>({
      dispatch,
      write: dispatch(node_api.endpoints.create_own_library.initiate({
        ...(discriminator.trim() === '' ? {} : { discriminator: discriminator.trim() }),
        ...(name.trim() === '' ? {} : { about: { name: name.trim() } })
      })),
      success: 'Library created.'
    })
    set_creating(false)
    if (created === null) return
    set_name('')
    set_discriminator('')
  }

  const retire = async () => {
    if (retiring === null) return
    const target = retiring
    set_retiring(null)
    await report_write({ dispatch, write: dispatch(node_api.endpoints.retire_own_library.initiate(target.address)), success: `Retired ${library_name(target)}.` })
  }

  return (
    <section className={styles.section} data-testid='own-libraries'>
      <h2>Your libraries</h2>
      {own.error !== undefined && <p className={styles.error}>{'message' in own.error ? own.error.message : 'The node request failed.'}</p>}
      <table className={styles.table}>
        <thead>
          <tr><th>Library</th><th /><th>Tracks</th><th /></tr>
        </thead>
        <tbody>
          {libraries.map((library) => (
            <OwnLibraryRow
              key={library.id}
              library={library}
              editing={library.address === profile_address}
              on_edit={() => { set_editing(library.address) }}
              on_retire={() => { set_retiring(library) }}
            />
          ))}
        </tbody>
      </table>
      <form className={styles.create} onSubmit={(event) => { create(event).catch(() => {}) }}>
        <h3>New library</h3>
        <input aria-label='New library name' placeholder='Name (optional)' maxLength={128} value={name} onChange={(event) => { set_name(event.target.value) }} />
        <input
          aria-label='Discriminator'
          placeholder='Address name (optional)'
          title='Letters, digits, and hyphens; part of the library address. The node picks one when left empty.'
          spellCheck={false}
          maxLength={64}
          value={discriminator}
          onChange={(event) => { set_discriminator(event.target.value) }}
        />
        <button type='submit' disabled={!writes_allowed || creating || !discriminator_valid}>{creating ? 'Creating' : 'Create'}</button>
        {!discriminator_valid && <p className={styles.error}>The address name is 1 to 64 letters, digits, and hyphens.</p>}
      </form>
      {profile_address !== null && <AboutEditor key={profile_address} address={profile_address} />}
      <Dialog open={retiring !== null} title='Retire library' on_close={() => { set_retiring(null) }}>
        <p>
          Retire {retiring === null ? '' : library_name(retiring)}? Retirement is permanent and cannot be undone. The library stays
          readable, and peers that link it keep it, but nothing new can be written to it from any of your devices.
        </p>
        <div className={styles.dialog_actions}>
          <button type='button' onClick={() => { set_retiring(null) }}>Cancel</button>
          <button type='button' onClick={() => { retire().catch(() => {}) }}>Retire permanently</button>
        </div>
      </Dialog>
    </section>
  )
}
