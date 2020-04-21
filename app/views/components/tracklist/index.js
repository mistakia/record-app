import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  tracklistActions
} from '@core/tracklists'
import {
  getPlayerIsPlaying,
  getPlayerIsShuffling,
  getPlayerIsLoading,
  getPlayerTrackId,
  getPlayerTracklistAddress,
  playerActions
} from '@core/player'
import { audio } from '@core/audio'
import Track from '@components/track'
import Loading from '@components/loading'

import render from './tracklist'

const Tracklist = ({
  displayLoadingIndicator,
  isPlaying,
  isShuffling,
  isLoading,
  pause,
  play,
  selectedTrackId,
  selectTrack,
  tracklistAddress,
  search,
  tracks,
  hasMore,
  loadNextTracks,
  query,
  showAdd,
  stopShuffle,
  shuffle,
  clearSearch
}) => {
  const isItemLoaded = index => tracks.has(index)
  const itemCount = query
    ? tracks.size
    : (hasMore ? tracks.size + 1 : tracks.size)
  const load = async () => loadNextTracks()
  const loadMoreItems = displayLoadingIndicator ? () => {} : load
  const listRef = React.createRef()
  const isEmpty = !displayLoadingIndicator && !itemCount

  const Row = ({ style, index }) => {
    if (displayLoadingIndicator && (index + 1) === itemCount) {
      return <div style={style}><Loading loading /></div>
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
        isLoading={isSelected && isLoading}
        play={isSelected ? play : selectTrack.bind(null, track.id, tracklistAddress)}
        {...{style, track, index, isSelected, pause, tracklistAddress}}
      />
    )
  }

  const onSearch = (query) => {
    search(query)
    listRef.current.scrollToItem(0)
  }

  const onClear = () => {
    clearSearch(tracklistAddress)
  }

  return render({
    loading: displayLoadingIndicator,
    onSearch,
    showAdd,
    shuffle,
    isItemLoaded,
    isShuffling,
    stopShuffle,
    tracklistAddress,
    query,
    onClear,
    itemCount,
    isEmpty,
    loadMoreItems,
    Row,
    listRef
  })
}

const mapStateToProps = createSelector(
  getPlayerIsPlaying,
  getPlayerIsShuffling,
  getPlayerTracklistAddress,
  getPlayerTrackId,
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  getPlayerIsLoading,
  (isPlaying, isShuffling, playerTracklistAddress, playerTrackId, tracklist, tracks, isLoading) => ({
    displayLoadingIndicator: tracklist.isPending,
    isPlaying,
    isShuffling: isShuffling && tracklist.address === playerTracklistAddress,
    isLoading,
    pause: audio.pause,
    play: audio.play,
    selectedTrackId: playerTrackId,
    tracklistAddress: tracklist.address,
    query: tracklist.query,
    hasMore: tracklist.hasMore,
    tracks
  })
)

const mapDispatchToProps = {
  search: tracklistActions.searchTracks,
  selectTrack: playerActions.playSelectedTrack,
  loadNextTracks: tracklistActions.loadNextTracks,
  shuffle: playerActions.shuffleSelectedTracklist,
  stopShuffle: playerActions.stopShuffle,
  clearSearch: tracklistActions.clearSearch
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Tracklist)
