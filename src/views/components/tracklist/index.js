import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  tracklistActions
} from '@core/tracklists'
import { getPlayerIsPlaying, getPlayerTrackId, playerActions } from '@core/player'
import { audio } from '@core/audio'

import Tracklist from './tracklist'

const mapStateToProps = createSelector(
  getPlayerIsPlaying,
  getPlayerTrackId,
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  (isPlaying, playerTrackId, tracklist, tracks) => ({
    displayLoadingIndicator: tracklist.isPending,
    isPlaying,
    pause: audio.pause,
    play: audio.play,
    selectedTrackId: playerTrackId,
    tracklistId: tracklist.id,
    hasMore: tracklist.hasMore,
    tracks
  })
)

const mapDispatchToProps = {
  selectTrack: playerActions.playSelectedTrack,
  loadNextTracks: tracklistActions.loadNextTracks
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Tracklist)
