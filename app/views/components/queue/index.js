import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { getPlayer, getPlayerTrack, getTracksForQueue, playerActions } from '@core/player'
import { audio } from '@core/audio'
import { contextMenuActions, getContextMenuInfo } from '@core/context-menu'

import Queue from './queue'

const mapStateToProps = createSelector(
  getPlayer,
  getPlayerTrack,
  getTracksForQueue,
  getContextMenuInfo,
  (player, track, tracks, contextMenuInfo) => ({
    isPlaying: player.isPlaying,
    pause: audio.pause,
    play: audio.play,
    isLoading: player.isLoading,
    isQueueVisible: player.isQueueVisible,
    contextMenuTrackId: contextMenuInfo.trackId,
    track,
    tracks
  })
)

const mapDispatchToProps = {
  playQueueTrack: playerActions.playQueueTrack,
  reorderQueue: playerActions.reorderQueue,
  clearQueue: playerActions.clearQueue,
  showContext: contextMenuActions.show
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Queue)
