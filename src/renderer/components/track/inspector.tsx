// The inspector (STYLE.md § Progressive Disclosure › Inspector): the cursor
// track's full detail in a pane docked on the right of the page column, so
// the row never has to carry it — every field, the libraries holding it, pin
// state, CIDs, listen count, and where each tag came from. Values are
// selectable plain text (spec §8.10.6). Empty values are left out.

import type { ReactNode } from 'react'

import styles from './inspector.module.css'
import { select_list_page, type ListSource } from './list-source.ts'
import { row_location } from './track-pages.ts'
import type { Track } from '#renderer/api/types.ts'
import { Artwork } from '#renderer/components/common/artwork.tsx'
import { format_seconds } from '#renderer/components/common/format-seconds.ts'
import { describe_holders, library_category, library_name } from '#renderer/components/library/library-category.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

const Field = ({ label, children, testid }: { label: string, children: ReactNode, testid?: string }) => (
  <>
    <dt>{label}</dt>
    <dd data-testid={testid}>{children}</dd>
  </>
)

const present = (value: unknown): boolean => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)

export const Inspector = ({ source, on_close }: { source: ListSource, on_close: () => void }) => {
  const track = use_app_selector((state): Track | undefined => {
    const { page, offset } = row_location(state.list_cursor.cursor)
    return select_list_page(state, source, page)?.items[offset]
  })
  const libraries = node_api.endpoints.get_libraries.useQuery().data
  const name_of = (address: string): string => {
    const library = libraries?.find((candidate) => candidate.address === address)
    return library === undefined ? address : library_name(library)
  }

  return (
    <aside className={styles.pane} aria-label='Track details' data-testid='inspector'>
      <header className={styles.head}>
        <span className={styles.kicker}>Details</span>
        <button type='button' data-variant='glyph' aria-label='Close details' onClick={on_close}>[x]</button>
      </header>
      {track === undefined
        ? <p className={styles.empty}>No track under the cursor.</p>
        : (
          <div className={styles.body}>
            <Artwork cid={track.artwork?.[0]} size={96} testid='inspector-artwork' />
            <p className={styles.title}>{track.title ?? 'Untitled'}</p>
            {present(track.artist) && <p className={styles.artist}>{track.artist}</p>}
            <dl className={styles.fields}>
              {present(track.album) && <Field label='Album'>{track.album}</Field>}
              {present(track.album_artist) && <Field label='Album artist'>{track.album_artist}</Field>}
              {present(track.artists) && track.artists?.length !== 1 && <Field label='Artists'>{track.artists?.join(', ')}</Field>}
              {present(track.remixer) && <Field label='Remixer'>{track.remixer}</Field>}
              {present(track.genre) && <Field label='Genre'>{track.genre?.join(', ')}</Field>}
              {present(track.bpm) && <Field label='BPM'>{track.bpm}</Field>}
              {present(track.duration_seconds) && <Field label='Time'>{format_seconds(track.duration_seconds ?? 0)}</Field>}
              {present(track.codec) && <Field label='Format'>{track.codec?.toUpperCase()}{track.lossless === true ? ', lossless' : ''}</Field>}
              {present(track.bitrate) && <Field label='Bitrate'>{Math.round((track.bitrate ?? 0) / 1000)} kbps</Field>}
              {present(track.sample_rate) && <Field label='Sample rate'>{track.sample_rate} Hz</Field>}
              <Field label='Size'>{(track.audio_size_bytes / 1024 / 1024).toFixed(1)} MiB</Field>
              <Field label='Listens' testid='inspector-listens'>{track.listen_count}</Field>
              {present(track.added_at_ms) && <Field label='Added'>{new Date(track.added_at_ms ?? 0).toLocaleString()}</Field>}
              <Field label='Pinned' testid='inspector-pinned'>{track.is_pinned === true ? '◆ kept on every device of this identity' : 'no'}</Field>
              <Field label='In your library'>{track.have_track ? 'yes' : 'no'}</Field>
            </dl>
            {present(track.library_addresses) && (
              <section className={styles.section}>
                <h3>Held by</h3>
                <p className={styles.summary} data-testid='track-holders'>in {describe_holders({ addresses: track.library_addresses, libraries })}</p>
                <ul className={styles.list}>
                  {track.library_addresses?.map((address) => {
                    const library = libraries?.find((candidate) => candidate.address === address)
                    return <li key={address}>{name_of(address)} <span className={styles.quiet}>{library === undefined ? 'discovered' : library_category(library)}</span></li>
                  })}
                </ul>
              </section>
            )}
            {track.tags.length > 0 && (
              <section className={styles.section}>
                <h3>Tags</h3>
                <ul className={styles.list}>
                  {track.tags.map(({ tag, library_address }) => <li key={`${library_address} ${tag}`}>{tag} <span className={styles.quiet}>from {name_of(library_address)}</span></li>)}
                </ul>
              </section>
            )}
            <section className={styles.section}>
              <h3>Identifiers</h3>
              <dl className={styles.ids}>
                <dt>Track</dt><dd>{track.id}</dd>
                <dt>Content</dt><dd data-testid='inspector-content-cid'>{track.content_cid}</dd>
                <dt>Audio</dt><dd>{track.audio_cid}</dd>
                {track.artwork?.map((cid, index) => <div key={cid} className={styles.row}><dt>Artwork {index + 1}</dt><dd>{cid}</dd></div>)}
              </dl>
            </section>
          </div>
          )}
    </aside>
  )
}
