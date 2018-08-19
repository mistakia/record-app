import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  tracklistActions
} from '@core/tracklists'
import { getPlayerIsPlaying, getPlayerTrackId, playerActions } from '@core/player'
import { audio } from '@core/audio'
import LoadingIndicator from '@components/loading-indicator'
import Loading from '@components/loading'
import Track from '@components/track'
import Button from '@components/button'

import render from './tracklist'

const Tracklist = ({
  displayLoadingIndicator,
  isPlaying,
  pause,
  play,
  selectedTrackId,
  selectTrack,
  tracklistId,
  tracks,
  hasMore,
  loadNextTracks,
  tags
}) => {
  const trackItems = tracks.map((track, index) => {
    const isSelected = track.id === selectedTrackId
    return (
      <Track
        key={index}
        track={track}
        isPlaying={isSelected && isPlaying}
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

  return render(trackItems, loading)
}

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
