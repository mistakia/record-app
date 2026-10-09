// Capability management for an owned library (spec §8.6.4): every
// capability ever issued, with grantee, actions, filter, conditions,
// issued-at, and status; issuing one (a key or a set of keys, actions,
// an optional FilterSpec, an optional expiry); and revoking an active one
// after a confirmation that says revocation is not retroactive. A retired
// library refuses writes, so its history shows read-only.

import { useState, type FormEvent } from 'react'

import styles from './capabilities.module.css'
import type { Capability } from '#renderer/api/types.ts'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { DialogActions } from '#renderer/components/common/dialog-actions.tsx'
import { FilterEditor } from '#renderer/components/filter/filter-editor.tsx'
import { CAPABILITY_FIELDS, describe_filter, filter_problems } from '#renderer/filter/filter-spec.ts'
import { describe_action, describe_conditions, describe_grantee, ISSUABLE_ACTIONS, parse_grantee_keys } from '#renderer/library/capabilities.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { report_write } from '#renderer/store/write.ts'

export const CapabilityRow = ({ capability, lead, action }: { capability: Capability, lead: string, action?: React.ReactNode }) => (
  <tr data-testid='capability-row' data-status={capability.status}>
    <td>{lead}</td>
    <td>{capability.actions.map(describe_action).join(', ')}</td>
    <td>{capability.filter === null ? 'Any' : describe_filter(capability.filter)}</td>
    <td>{capability.conditions.length === 0 ? 'None' : describe_conditions(capability.conditions).join('; ')}</td>
    <td>{new Date(capability.issued_at_ms).toLocaleString()}</td>
    <td><span className={`${styles.status} ${styles[capability.status] ?? ''}`}>{capability.status}</span></td>
    <td>{action}</td>
  </tr>
)

const IssueForm = ({ address }: { address: string }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const [keys, set_keys] = useState('')
  const [actions, set_actions] = useState<string[]>(['library.append_track'])
  const [filter, set_filter] = useState<unknown>(null)
  const [expires, set_expires] = useState('')
  const [busy, set_busy] = useState(false)
  const grantee = parse_grantee_keys(keys)
  const expires_at = expires === '' ? null : new Date(expires).getTime()
  const filter_ok = filter === null || (filter !== undefined && filter_problems(filter).length === 0)
  const expiry_ok = expires_at === null || (Number.isFinite(expires_at) && expires_at > Date.now())
  const ready = grantee.ok && actions.length > 0 && filter_ok && expiry_ok

  const issue = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready || !grantee.ok) return
    set_busy(true)
    const issued = await report_write<Capability>({
      dispatch,
      write: dispatch(node_api.endpoints.issue_capability.initiate({
        address,
        grantee: grantee.grantee,
        actions,
        ...(filter === null ? {} : { filter }),
        ...(expires_at === null ? {} : { conditions: [{ type: 'expires_at', at: expires_at }] })
      })),
      success: 'Capability issued.'
    })
    set_busy(false)
    if (!issued.ok) return
    set_keys('')
    set_filter(null)
    set_expires('')
  }

  return (
    <form className={styles.issue} onSubmit={(event) => { issue(event).catch(() => {}) }} data-testid='issue-capability'>
      <h4>Issue a capability</h4>
      <label className={styles.field}>
        Grantee public keys, one per line
        <textarea aria-label='Grantee public keys' rows={2} spellCheck={false} value={keys} onChange={(event) => { set_keys(event.target.value) }} />
      </label>
      {keys.trim() !== '' && !grantee.ok && <p className={styles.error}>{grantee.reason}</p>}
      <fieldset className={styles.actions_set}>
        <legend>Actions</legend>
        {ISSUABLE_ACTIONS.map(({ verb, label }) => (
          <label key={verb}>
            <input
              type='checkbox'
              checked={actions.includes(verb)}
              onChange={(event) => { set_actions(event.target.checked ? [...actions, verb] : actions.filter((each) => each !== verb)) }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <FilterEditor label='Only writes matching (optional)' value={filter} on_change={set_filter} fields={CAPABILITY_FIELDS} />
      <label className={styles.field}>
        Expires (optional)
        <input aria-label='Expires' type='datetime-local' value={expires} onChange={(event) => { set_expires(event.target.value) }} />
      </label>
      {!expiry_ok && <p className={styles.error}>The expiry must be in the future.</p>}
      <div>
        <button type='submit' data-variant='primary' disabled={!writes_allowed || busy || !ready}>{busy ? 'Issuing' : 'Issue'}</button>
      </div>
    </form>
  )
}

const PREVIEW = 5

export const LibraryCapabilities = ({ address, name, retired }: { address: string, name: string, retired: boolean }) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const capabilities = node_api.endpoints.get_library_capabilities.useQuery(address)
  const [revoking, set_revoking] = useState<Capability | null>(null)
  const [show_all, set_show_all] = useState(false)

  const revoke = async () => {
    if (revoking === null) return
    const target = revoking
    set_revoking(null)
    await report_write({ dispatch, write: dispatch(node_api.endpoints.revoke_capability.initiate({ address, capability_id: target.capability_id })), success: 'Capability revoked.' })
  }

  return (
    <section className={styles.section} data-testid='library-capabilities' aria-label={`Capabilities for ${name}`}>
      {capabilities.error !== undefined && <p className={styles.error}>{'message' in capabilities.error ? capabilities.error.message : 'The node request failed.'}</p>}
      {capabilities.data?.length === 0 && <p className={styles.muted}>No capabilities issued yet.</p>}
      {capabilities.data !== undefined && capabilities.data.length > 0 && (
        <table className={styles.table}>
          <thead><tr><th>Grantee</th><th>Actions</th><th>Filter</th><th>Conditions</th><th>Issued</th><th>Status</th><th /></tr></thead>
          <tbody>
            {capabilities.data.slice(0, show_all ? undefined : PREVIEW).map((capability) => (
              <CapabilityRow
                key={capability.capability_id}
                capability={capability}
                lead={describe_grantee(capability.grantee)}
                action={!retired && capability.status === 'active' && <button type='button' data-size='small' disabled={!writes_allowed} onClick={() => { set_revoking(capability) }}>Revoke</button>}
              />
            ))}
          </tbody>
        </table>
      )}
      {!show_all && (capabilities.data?.length ?? 0) > PREVIEW && (
        <button type='button' data-variant='ghost' data-size='small' className={styles.more} onClick={() => { set_show_all(true) }}>show {(capabilities.data?.length ?? 0) - PREVIEW} more</button>
      )}
      {retired ? <p className={styles.muted}>This library is retired, so no capability can be issued or revoked in it.</p> : <IssueForm address={address} />}
      <Dialog open={revoking !== null} title='Revoke capability' on_close={() => { set_revoking(null) }}>
        <p>
          Revoke the capability for {revoking === null ? '' : describe_grantee(revoking.grantee)}? Writes made under it after the revocation will not
          count, including writes on devices that have not yet seen it, which become inert when they do. Writes already made before it stay valid:
          revocation is not retroactive.
        </p>
        <DialogActions>
          <button type='button' onClick={() => { set_revoking(null) }}>Cancel</button>
          <button type='button' data-variant='danger' onClick={() => { revoke().catch(() => {}) }}>Revoke</button>
        </DialogActions>
      </Dialog>
    </section>
  )
}
