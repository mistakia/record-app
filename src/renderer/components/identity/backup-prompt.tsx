// The first-launch backup prompt (spec §8.5.3): in bundled mode, until the
// identity has been exported once. Dismissing it lasts for the session, so
// it comes back at the next launch until an export happens. A remote node's
// identity is its operator's to back up, so remote mode never prompts.

import { useState } from 'react'
import { useNavigate } from 'react-router'

import styles from '#renderer/components/layout/connection-banner.module.css'
import { read_last_export } from '#renderer/identity/identity.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const should_prompt_backup = ({ mode, node_key, last_export }: { mode: string | undefined, node_key: string | null, last_export: number | null }): boolean =>
  mode === 'bundled' && node_key !== null && last_export === null

export const BackupPrompt = () => {
  const navigate = useNavigate()
  const config = use_app_selector((state) => state.connection.config)
  const [dismissed, set_dismissed] = useState(false)
  const node_key = config?.node_key ?? null
  // Only once the bundled node runs: before that there is no identity to back up.
  const running = use_app_selector((state) => state.bundled.state?.status === 'running')
  if (dismissed || !running || !should_prompt_backup({ mode: config?.mode, node_key, last_export: node_key === null ? null : read_last_export(node_key) })) return null
  return (
    <div className={styles.stale} role='status' data-testid='backup-prompt'>
      <span>Back up your identity: without an export of its key, a lost device means a library you can no longer write to.</span>
      <button type='button' onClick={() => { navigate('/identity') }}>Back up now</button>
      <button type='button' onClick={() => { set_dismissed(true) }}>Later</button>
    </div>
  )
}
