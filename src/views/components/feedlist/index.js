import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getFeed, getItemsForFeed, feedActions } from '@core/feed'
import { getPlayerIsPlaying, getPlayerTrackId, playerActions } from '@core/player'
import { audio } from '@core/audio'

import Feedlist from './feedlist'

const mapStateToProps = createSelector(
  getFeed,
  getItemsForFeed,
  getPlayerIsPlaying,
  getPlayerTrackId,
  (feedlist, items, isPlaying, playerTrackId) => ({
    displayLoadingIndicator: feedlist.isPending,
    hasMore: feedlist.hasMore,
    items,
    isPlaying,
    play: audio.play,
    pause: audio.pause,
    selectedTrackId: playerTrackId
  })
)

const mapDispatchToProps = {
  selectTrack: playerActions.playSelectedTrack,
  loadNextFeed: feedActions.loadNextFeed
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Feedlist)
