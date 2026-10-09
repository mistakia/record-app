// What a track list does with its rows, shared by Tracks and Recently
// Played: play from a row with its source, queue, tag, adopt, pin, remove,
// and copy, with the dialogs those open.

import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import type { ListActions } from './track-list.tsx'
import type { Track } from '#renderer/api/types.ts'
import { copy_text } from '#renderer/components/common/copy-text.ts'
import type { MenuItem } from '#renderer/components/common/context-menu.tsx'
import { Dialog } from '#renderer/components/common/dialog.tsx'
import { DialogActions } from '#renderer/components/common/dialog-actions.tsx'
import { AdoptDialog } from '#renderer/components/track/adopt-dialog.tsx'
import { RemoveDialog, removable_from } from '#renderer/components/track/remove-dialog.tsx'
import { TagEditor } from '#renderer/components/track/tag-editor.tsx'
import { add_to_queue, play_tracks, remove_from_queue, toggle_playback } from '#renderer/player/player-controller.ts'
import { tracks_route } from '#renderer/routes.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import type { PlaySource } from '#renderer/store/player.ts'
import { report_write } from '#renderer/store/write.ts'

export const use_track_actions = ({ viewed_library, listen_library, source, on_tag_clicked, toggle_inspector, clear_search, close_pane }: {
  // The library the list shows ('' for all), the default write target.
  viewed_library: string
  // The library a listen records.
  listen_library: string
  source: PlaySource
  on_tag_clicked: (input: { tag: string, library_address: string }) => void
  toggle_inspector: () => void
  clear_search: () => boolean
  close_pane: () => boolean
}): { actions: ListActions, dialogs: ReactNode } => {
  const dispatch = use_app_dispatch()
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const upcoming = use_app_selector((state) => state.player.queue.entries.slice(state.player.queue.index + 1))
  const [tagging, set_tagging] = useState<{ tracks: Track[], anchor: { x: number, y: number } } | null>(null)
  const [adopting, set_adopting] = useState<Track | null>(null)
  const [removing, set_removing] = useState<Track | null>(null)
  const [untagging, set_untagging] = useState<{ track: Track, tag: string, library_address: string } | null>(null)

  // The adder opens under the row it tags, beside the title.
  const open_tagger = (tracks: Track[], row: number | null) => {
    if (tracks.length === 0) return
    const rect = row === null ? undefined : document.querySelector(`[data-row='${row}']`)?.getBoundingClientRect()
    set_tagging({ tracks, anchor: rect === undefined ? { x: window.innerWidth / 2 - 140, y: window.innerHeight / 3 } : { x: rect.left + 80, y: rect.bottom } })
  }

  // Spec §4.6.2, §8.6.5a: a pin keeps the track's audio on every device of
  // the identity, whatever each device's replication mode.
  const toggle_pin = (track: Track) => {
    const pinned = track.is_pinned !== true
    report_write({
      dispatch,
      write: dispatch(node_api.endpoints.pin_track.initiate({ cid: track.audio_cid, pinned })),
      success: pinned ? 'Pinned: kept on all your devices.' : 'Unpinned.'
    }).catch(() => {})
  }

  const menu_items = (track: Track, row: number | null = null): MenuItem[] => {
    const queued = upcoming.find(({ track_id }) => track_id === track.id)
    return [
      { label: 'Play', shortcut: 'Enter', on_select: () => { play_tracks({ tracks: [track], start_index: 0, library_address: listen_library, source }) } },
      { label: 'Play next', shortcut: 'n', on_select: () => { add_to_queue({ tracks: [track], at: 'next', library_address: listen_library }) } },
      { label: 'Add to queue', shortcut: 'q', on_select: () => { add_to_queue({ tracks: [track], at: 'end', library_address: listen_library }) } },
      ...(queued === undefined ? [] : [{ label: 'Remove from queue', on_select: () => { remove_from_queue(queued.queue_id) } }]),
      { label: 'Add tag', shortcut: 't', on_select: () => { open_tagger([track], row) } },
      { label: 'Adopt to library', shortcut: 'f', on_select: () => { set_adopting(track) } },
      { label: 'Details', shortcut: 'i', on_select: toggle_inspector },
      { label: track.is_pinned === true ? 'Unpin' : 'Pin', on_select: () => { toggle_pin(track) } },
      ...(removable_from({ track, libraries: libraries.data }).length > 0 ? [{ label: 'Remove from library', on_select: () => { set_removing(track) } }] : []),
      { label: 'Copy CID', on_select: () => { copy_text({ dispatch, text: track.content_cid, label: 'the CID' }).catch(() => {}) } }
    ]
  }

  const remove_tag = async () => {
    if (untagging === null) return
    const { track, tag, library_address } = untagging
    set_untagging(null)
    await report_write({ dispatch, write: dispatch(node_api.endpoints.remove_tag.initiate({ track_id: track.id, tag, library_address })), success: `Removed ${tag}.` })
  }

  const actions: ListActions = {
    // index -1: the row is the current track, so it pauses or resumes.
    play: ({ page_tracks, index }) => {
      if (index === -1) toggle_playback()
      else play_tracks({ tracks: page_tracks, start_index: index, library_address: listen_library, source })
    },
    queue: ({ tracks, at }) => { if (tracks.length > 0) add_to_queue({ tracks, at, library_address: listen_library }) },
    adopt: (tracks) => { if (tracks[0] !== undefined) set_adopting(tracks[0]) },
    add_tag: ({ tracks, row }) => { open_tagger(tracks, row) },
    tag_clicked: on_tag_clicked,
    remove_tag: set_untagging,
    menu_items,
    toggle_inspector,
    clear_search,
    close_pane
  }

  const dialogs = (
    <>
      {tagging !== null && <TagEditor tracks={tagging.tracks} anchor={tagging.anchor} viewed_library={viewed_library} on_close={() => { set_tagging(null) }} />}
      {removing !== null && <RemoveDialog track={removing} viewed_library={viewed_library} on_close={() => { set_removing(null) }} />}
      <Dialog open={untagging !== null} title='Remove tag' on_close={() => { set_untagging(null) }}>
        <p>Remove the tag {untagging?.tag} from {untagging?.track.title ?? 'this track'}?</p>
        <DialogActions>
          <button type='button' onClick={() => { set_untagging(null) }}>Cancel</button>
          <button type='button' data-variant='danger' onClick={() => { remove_tag().catch(() => {}) }}>Remove</button>
        </DialogActions>
      </Dialog>
      {adopting !== null && <AdoptDialog track={adopting} viewed_library={viewed_library} on_close={() => { set_adopting(null) }} />}
    </>
  )
  return { actions, dialogs }
}

// A chip from another library opens that library filtered by the tag.
export const use_tag_navigation = (): ((input: { tag: string, library_address: string }) => void) => {
  const navigate = useNavigate()
  return ({ tag, library_address }) => { navigate(tracks_route({ library_address, filters: { query: '', tags: [tag], sort: 'added_at', order: 'desc' } })) }
}
