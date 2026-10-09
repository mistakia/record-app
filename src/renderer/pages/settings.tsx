// Settings (STYLE.md § Components › Settings): legacy-v0's settings page as
// framed sections — Connection, Storage, Shortcuts, Peers, Diagnostics.
// `?section=` scrolls to one, as an unconfigured launch does to Connection.

import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

import styles from './settings.module.css'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { ShortcutTable } from '#renderer/components/common/shortcut-table.tsx'
import { SnapshotControls } from '#renderer/components/common/snapshot-controls.tsx'
import { ConnectionSection } from '#renderer/components/settings/connection-section.tsx'
import { DiagnosticsSection } from '#renderer/components/settings/diagnostics-section.tsx'
import { PeersSection } from '#renderer/components/settings/peers-section.tsx'
import { node_api } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const Settings = () => {
  const [search] = useSearchParams()
  const section = search.get('section')
  const configured = use_app_selector((state) => state.connection.config?.node_key != null)
  const peers = node_api.endpoints.get_peers.useQuery(undefined, { skip: !configured })

  useEffect(() => {
    if (section !== null) document.getElementById(`settings-${section}`)?.scrollIntoView({ block: 'start' })
  }, [section])

  return (
    <div className={styles.page}>
      <div id='settings-connection'><FramedSection title='Connection' testid='settings-connection'><ConnectionSection /></FramedSection></div>
      <div id='settings-storage'><FramedSection title='Storage' fold_id='settings-storage'><SnapshotControls /></FramedSection></div>
      <div id='settings-shortcuts'><FramedSection title='Shortcuts' fold_id='settings-shortcuts' default_open={false}><ShortcutTable /></FramedSection></div>
      {configured && (
        <div id='settings-peers'>
          <FramedSection title='Peers' fold_id='settings-peers' count={peers.data?.length}>
            <PeersSection peers={peers.data} error={peers.error === undefined ? null : 'message' in peers.error ? peers.error.message : 'The node request failed.'} />
          </FramedSection>
        </div>
      )}
      <div id='settings-diagnostics'><FramedSection title='Diagnostics' fold_id='settings-diagnostics'><DiagnosticsSection /></FramedSection></div>
    </div>
  )
}
