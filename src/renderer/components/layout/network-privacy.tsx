// The bundled node's network privacy (spec §8.3.5): Public, or Masked through
// Tor, with what each exposes. A change is saved at once and restarts the
// bundled node. The selection shows the privacy the node runs under, or the
// one just chosen until the node has relaunched under it.

import { useState } from 'react'

import styles from './network-privacy.module.css'
import type { BundledState, NetworkPrivacy } from '#shared/bridge.ts'

const OPTIONS: Array<{ value: NetworkPrivacy, label: string, detail: string }> = [
  {
    value: 'public',
    label: 'Public',
    detail: 'Peers see this computer\'s IP address. Once the node is reachable from the internet it also lists that address on the public mainline DHT, so new peers can find it.'
  },
  {
    value: 'masked',
    label: 'Masked through Tor',
    detail: 'Every connection goes out through Tor, so peers do not see this computer\'s IP address. No one can connect to the node, so it shares music only with peers it reached itself, and connections are slower.'
  }
]

export const NetworkPrivacySelector = ({ state }: { state: BundledState | null }) => {
  const [saving, set_saving] = useState(false)
  const [chosen, set_chosen] = useState<NetworkPrivacy | null>(null)
  const [error, set_error] = useState<string | null>(null)
  if (state === null) return null
  const running = state.network_privacy
  const shown = chosen ?? running
  const restarting = chosen !== null && chosen !== running

  const choose = async (privacy: NetworkPrivacy): Promise<void> => {
    if (privacy === shown) return
    set_saving(true)
    set_chosen(privacy)
    set_error(null)
    try {
      const saved = await window.record.bundled.set_network_privacy(privacy)
      if (!saved.ok) {
        set_chosen(null)
        set_error(saved.failure.message)
      }
    } catch {
      set_chosen(null)
      set_error('The network privacy could not be saved.')
    } finally {
      set_saving(false)
    }
  }

  return (
    <fieldset className={styles.privacy} disabled={saving} data-testid='network-privacy'>
      <legend>Network privacy</legend>
      {OPTIONS.map(({ value, label, detail }) => (
        <label key={value} className={styles.option}>
          <input type='radio' name='network-privacy' value={value} checked={shown === value} onChange={() => { choose(value).catch(() => {}) }} />
          <span>
            <strong>{label}</strong>
            <span className={styles.detail}>{detail}</span>
          </span>
        </label>
      ))}
      <p className={styles.note}>
        {restarting ? 'Restarting the bundled node.' : 'Changing this restarts the bundled node.'} Update checks reach GitHub directly either way.
      </p>
      {error !== null && <p className={styles.error}>{error}</p>}
    </fieldset>
  )
}
