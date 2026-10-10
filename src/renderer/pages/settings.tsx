// Settings (STYLE.md § Components › Settings): legacy-v0's settings page as
// framed sections — Connection, Storage, Shortcuts, Peers, Diagnostics —
// behind a section index. `?section=` opens on one, as an unconfigured
// launch does on Connection.

import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { IndexedPage, type IndexedSection } from '#renderer/components/common/indexed-page.tsx'
import { ShortcutTable } from '#renderer/components/common/shortcut-table.tsx'
import { SnapshotControls } from '#renderer/components/common/snapshot-controls.tsx'
import { ConnectionSection } from '#renderer/components/settings/connection-section.tsx'
import { DiagnosticsSection } from '#renderer/components/settings/diagnostics-section.tsx'
import { PeersSection } from '#renderer/components/settings/peers-section.tsx'
import { node_api } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export const Settings = () => {
  const configured = use_app_selector((state) => state.connection.config?.node_key != null)
  const peers = node_api.endpoints.get_peers.useQuery(undefined, { skip: !configured })

  const sections: IndexedSection[] = [
    { id: 'connection', title: 'Connection', node: <FramedSection title='Connection' testid='settings-connection'><ConnectionSection /></FramedSection> },
    { id: 'storage', title: 'Storage', fold_id: 'settings-storage', node: <FramedSection title='Storage' fold_id='settings-storage'><SnapshotControls /></FramedSection> },
    { id: 'shortcuts', title: 'Shortcuts', fold_id: 'settings-shortcuts', node: <FramedSection title='Shortcuts' fold_id='settings-shortcuts' default_open={false}><ShortcutTable /></FramedSection> },
    ...(configured
      ? [{
          id: 'peers',
          title: 'Peers',
          fold_id: 'settings-peers',
          node: (
            <FramedSection title='Peers' fold_id='settings-peers' default_open={false} count={peers.data?.length}>
              <PeersSection peers={peers.data} error={peers.error === undefined ? null : 'message' in peers.error ? peers.error.message : 'The node request failed.'} />
            </FramedSection>
          )
        }]
      : []),
    { id: 'diagnostics', title: 'Diagnostics', fold_id: 'settings-diagnostics', node: <FramedSection title='Diagnostics' fold_id='settings-diagnostics'><DiagnosticsSection /></FramedSection> }
  ]

  return <IndexedPage prefix='settings' sections={sections} />
}
