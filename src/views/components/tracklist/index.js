import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentTracklist,
  getSearchTracksForCurrentTracklist,
  getTracksForCurrentTracklist,
  tracklistActions
} from '@core/tracklists'
import {
  getPlayerIsPlaying,
  getPlayerIsShuffling,
  getPlayerIsLoading,
  getPlayerTrackId,
  getPlayerTracklistId,
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
  tracklistId,
  search,
  searchTracks,
  tracks,
  hasMore,
  loadNextTracks,
  searchQuery,
  showAdd,
  shuffle,
  tags,
  clearSearch
}) => {
  const isItemLoaded = index => tracks.has(index)
  const itemCount = searchQuery
    ? searchTracks.size
    : (hasMore ? tracks.size + 1 : tracks.size)
  const load = async () => loadNextTracks()
  const loadMoreItems = displayLoadingIndicator ? () => {} : load

  const Row = ({ style, index }) => {
    if (displayLoadingIndicator && (index + 1) === itemCount) {
      return <div style={style}><Loading loading /></div>
    }

    const track = searchQuery ? searchTracks.get(index) : tracks.get(index)
    if (!track) {
      return null
    }

    const isSelected = track.id === selectedTrackId
    return (
      <Track
        style={style}
        key={index}
        track={track}
        isPlaying={isSelected && isPlaying}
        isLoading={isSelected && isLoading}
        isSelected={isSelected}
        pause={pause}
        play={isSelected ? play : selectTrack.bind(null, track.id, tracklistId)}
      />
    )
  }

  const onSearch = (query) => {
    search(tracklistId, query, tags)
  }

  const onClear = () => {
    clearSearch(tracklistId)
  }

  return render({
    onSearch,
    showAdd,
    shuffle,
    isItemLoaded,
    isShuffling,
    tracklistId,
    searchQuery,
    onClear,
    itemCount,
    loadMoreItems,
    Row
  })
}

const mapStateToProps = createSelector(
  getPlayerIsPlaying,
  getPlayerIsShuffling,
  getPlayerTracklistId,
  getPlayerTrackId,
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  getSearchTracksForCurrentTracklist,
  getPlayerIsLoading,
  (isPlaying, isShuffling, playerTracklistId, playerTrackId, tracklist, tracks, searchTracks, isLoading) => ({
    displayLoadingIndicator: tracklist.isPending,
    isPlaying,
    isShuffling: isShuffling && tracklist.id === playerTracklistId,
    isLoading,
    pause: audio.pause,
    play: audio.play,
    selectedTrackId: playerTrackId,
    tracklistId: tracklist.id,
    searchQuery: tracklist.query,
    hasMore: tracklist.hasMore,
    tracks,
    searchTracks
  })
)

const mapDispatchToProps = {
  search: tracklistActions.searchTracks,
  selectTrack: playerActions.playSelectedTrack,
  loadNextTracks: tracklistActions.loadNextTracks,
  shuffle: playerActions.shuffleTracklist,
  clearSearch: tracklistActions.clearSearch
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Tracklist)
