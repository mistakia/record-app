import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import {
  getPlayer,
  getPlayerTrack,
  getTracksForQueue,
  playerActions,
  getPlayerTracklistLog,
  getTracksForPlayerTracklist
} from '@core/player'
import { audio } from '@core/audio'
import { contextMenuActions, getContextMenuInfo } from '@core/context-menu'

import Queue from './queue'

const mapStateToProps = createSelector(
  getPlayer,
  getPlayerTrack,
  getTracksForQueue,
  getContextMenuInfo,
  getTracksForPlayerTracklist,
  getPlayerTracklistLog,
  (player, track, tracks, contextMenuInfo, playerTracklistTracks, log) => ({
    isPlaying: player.isPlaying,
    pause: audio.pause,
    play: audio.play,
    isLoading: player.isLoading,
    isQueueVisible: player.isQueueVisible,
    contextMenuTrackId: contextMenuInfo.trackId,
    tracklist: player.tracklist,
    tracklistLog: log,
    isShuffling: player.isShuffling,
    track,
    tracks,
    playerTracklistTracks
  })
)

const mapDispatchToProps = {
  playQueueTrack: playerActions.playQueueTrack,
  playPlayerTracklistTrack: playerActions.playPlayerTracklistTrack,
  reorderQueue: playerActions.reorderQueue,
  reorderPlayerTracklist: playerActions.reorderPlayerTracklist,
  clearQueue: playerActions.clearQueue,
  toggleQueue: playerActions.toggleQueue,
  showContext: contextMenuActions.show
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Queue)
