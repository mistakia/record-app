import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import CircularProgress from '@material-ui/core/CircularProgress'

import {
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  tracklistActions
} from '@core/tracklists'
import {
  getPlayer,
  playerActions
} from '@core/player'
import { audio } from '@core/audio'
import Track from '@components/track'

import render from './tracklist'

const Tracklist = ({
  isTracklistLoading,
  isPlaying,
  isPlayerLoading,
  pause,
  play,
  selectedTrackId,
  selectTrack,
  tracklistAddress,
  search,
  tracks,
  hasMore,
  loadNext,
  query,
  clearSearch,
  ...props
}) => {
  const isItemLoaded = index => tracks.has(index)
  const load = async () => loadNext()
  const loadMoreItems = isTracklistLoading ? () => {} : load
  const listRef = React.createRef()
  const isEmpty = !isTracklistLoading && !tracks.size

  const Row = ({ style, index }) => {
    if (isTracklistLoading && index === tracks.size) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...style
          }}
        >
          <CircularProgress size={30} />
        </div>
      )
    }

    const track = tracks.get(index)
    if (!track) {
      return null
    }

    const isSelected = track.id === selectedTrackId
    return (
      <Track
        key={index}
        isPlaying={isSelected && isPlaying}
        isLoading={isSelected && isPlayerLoading}
        play={isSelected ? play : selectTrack.bind(null, track.id, tracklistAddress)}
        {...{style, track, index, isSelected, pause, tracklistAddress}}
      />
    )
  }

  const onSearch = (query) => search(query)
  const onClear = () => clearSearch()

  return render({
    isLoading: isTracklistLoading,
    onSearch,
    isItemLoaded,
    tracklistAddress,
    query,
    onClear,
    itemCount: isTracklistLoading
      ? (tracks.size + 1)
      : (hasMore ? tracks.size + 1 : tracks.size),
    isEmpty,
    loadMoreItems,
    Row,
    listRef,
    ...props
  })
}

const mapStateToProps = createSelector(
  getPlayer,
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  (player, tracklist, tracks) => ({
    isTracklistLoading: tracklist.isPending,
    isPlaying: player.isPlaying,
    isShuffling: player.isShuffling && tracklist.path === player.tracklist.path,
    isPlayerLoading: player.isLoading,
    pause: audio.pause,
    play: audio.play,
    selectedTrackId: player.trackId,
    query: tracklist.query,
    hasMore: tracklist.hasMore,
    tracks
  })
)

const mapDispatchToProps = {
  search: tracklistActions.searchTracks,
  selectTrack: playerActions.playSelectedTrack,
  shuffle: playerActions.shuffleSelectedTracklist,
  stopShuffle: playerActions.stopShuffle,
  clearSearch: tracklistActions.clearSearch
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Tracklist)
