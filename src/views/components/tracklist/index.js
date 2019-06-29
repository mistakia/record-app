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
  tracks,
  hasMore,
  loadNextTracks,
  showAdd,
  shuffle,
  tags
}) => {
  const trackItems = tracks.map((track, index) => {
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
  })

  const loading = (
    <Loading
      loading={displayLoadingIndicator}
      onClick={loadNextTracks}
      hasMore={hasMore}
    />
  )

  return render({ trackItems, loading, showAdd, shuffle, isShuffling, tracklistId })
}

const mapStateToProps = createSelector(
  getPlayerIsPlaying,
  getPlayerIsShuffling,
  getPlayerTracklistId,
  getPlayerTrackId,
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  getPlayerIsLoading,
  (isPlaying, isShuffling, playerTracklistId, playerTrackId, tracklist, tracks, isLoading) => ({
    displayLoadingIndicator: tracklist.isPending,
    isPlaying,
    isShuffling: isShuffling && tracklist.id === playerTracklistId,
    isLoading,
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
  loadNextTracks: tracklistActions.loadNextTracks,
  shuffle: playerActions.shuffleTracklist
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Tracklist)
