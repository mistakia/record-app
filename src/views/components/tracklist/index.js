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
import Loading from '@components/loading'
import Track from '@components/track'

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
  const renderTrack = (track, index) => {
    if (!track) {
      return null
    }

    const isSelected = track.id === selectedTrackId
    return (
      <Track
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

  const trackItems = tracks.map(renderTrack)
  const searchItems = searchTracks.map(renderTrack)

  const loading = (
    <Loading
      loading={displayLoadingIndicator}
      onClick={loadNextTracks}
      hasMore={hasMore}
    />
  )

  const onSearch = (query) => {
    search(tracklistId, query, tags)
  }

  const onClear = () => {
    clearSearch(tracklistId)
  }

  return render({
    trackItems,
    searchItems,
    onSearch,
    loading,
    showAdd,
    shuffle,
    isShuffling,
    tracklistId,
    searchQuery,
    onClear
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
