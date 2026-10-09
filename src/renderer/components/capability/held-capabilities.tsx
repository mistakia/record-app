// Capabilities this identity holds from others (spec §8.6.4): granter,
// library, actions, filter, conditions, issued-at, and status, and per
// library "Leave shared library", which stops the app offering writes there
// without revoking anything; the user can rejoin. A node without the
// endpoint (404) shows that it cannot list them (§8.7.6).

import styles from './capabilities.module.css'
import { CapabilityRow } from './library-capabilities.tsx'
import { library_name } from '#renderer/components/library/library-category.ts'
import { short_key } from '#renderer/library/capabilities.ts'
import { set_left, use_left_libraries } from '#renderer/library/left-libraries.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const HeldCapabilities = () => {
  const node_key = use_app_selector((state) => state.connection.config?.node_key ?? null)
  const held = node_api.endpoints.get_held_capabilities.useQuery()
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const left = use_left_libraries(node_key)
  const name_of = (address: string): string => {
    const library = libraries.data?.find((each) => each.address === address)
    return library === undefined ? address : library_name(library)
  }
  const not_served = held.error !== undefined && 'status' in held.error && held.error.status === 404
  // Held from others: a grant in one of the identity's own libraries is not.
  const own = new Set((libraries.data ?? []).filter(({ is_own }) => is_own).map(({ address }) => address))
  const from_others = held.data?.filter(({ library_address }) => !own.has(library_address))
  const addresses = [...new Set((from_others ?? []).map(({ library_address }) => library_address))]

  return (
    <section className={styles.section} data-testid='held-capabilities'>
      {not_served && <p className={styles.muted}>This node cannot list the capabilities you hold.</p>}
      {!not_served && held.error !== undefined && <p className={styles.error}>{'message' in held.error ? held.error.message : 'The node request failed.'}</p>}
      {from_others?.length === 0 && <p className={styles.muted}>No other identity has granted you a capability.</p>}
      {addresses.map((address) => {
        const is_left = left.includes(address)
        return (
          <div key={address} className={styles.held_library} data-testid='held-library' data-left={is_left}>
            <div className={styles.held_header}>
              <strong>{name_of(address)}</strong>
              <span className={styles.muted}>{address}</span>
              {is_left
                ? <button type='button' data-size='small' onClick={() => { set_left({ node_key, library_address: address, left: false }) }}>Rejoin</button>
                : <button type='button' data-size='small' onClick={() => { set_left({ node_key, library_address: address, left: true }) }}>Leave shared library</button>}
            </div>
            {is_left && <p className={styles.muted}>You left this library: the app offers no writes to it. Your capabilities stay valid, and only the granter can revoke them.</p>}
            <table className={styles.table}>
              <thead><tr><th>Granter</th><th>Actions</th><th>Filter</th><th>Conditions</th><th>Issued</th><th>Status</th><th>Expires</th></tr></thead>
              <tbody>
                {(from_others ?? []).filter(({ library_address }) => library_address === address).map((capability) => (
                  <CapabilityRow
                    key={capability.capability_id}
                    capability={capability}
                    lead={short_key(capability.issuer)}
                    action={capability.expires_at_ms === null || capability.expires_at_ms === undefined ? 'Never' : new Date(capability.expires_at_ms).toLocaleString()}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </section>
  )
}
