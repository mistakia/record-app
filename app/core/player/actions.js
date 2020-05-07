export const playerActions = {
  AUDIO_ENDED: 'AUDIO_ENDED',
  AUDIO_PAUSED: 'AUDIO_PAUSED',
  AUDIO_PLAYING: 'AUDIO_PLAYING',
  AUDIO_TIME_UPDATED: 'AUDIO_TIME_UPDATED',
  AUDIO_VOLUME_CHANGED: 'AUDIO_VOLUME_CHANGED',

  PLAY_TRACK: 'PLAY_TRACK',
  PLAY_QUEUE_TRACK: 'PLAY_QUEUE_TRACK',
  PLAY_TRACKLIST: 'PLAY_TRACKLIST',
  PLAY_SELECTED_TRACK: 'PLAY_SELECTED_TRACK',
  PLAY_PREVIOUS: 'PLAY_PREVIOUS',
  PLAY_NEXT: 'PLAY_NEXT',

  SHUFFLE_SELECTED_TRACKLIST: 'SHUFFLE_SELECTED_TRACKLIST',
  SHUFFLE_TRACKLIST: 'SHUFFLE_TRACKLIST',
  STOP_SHUFFLE: 'STOP_SHUFFLE',

  QUEUE_TRACK: 'QUEUE_TRACK',
  UNQUEUE_TRACK: 'UNQUEUE_TRACK',
  REORDER_QUEUE: 'REORDER_QUEUE',
  CLEAR_QUEUE: 'CLEAR_QUEUE',
  TOGGLE_QUEUE: 'TOGGLE_QUEUE',
  TOGGLE_PLAY_REPEAT: 'TOGGLE_PLAY_REPEAT',

  FETCH_PLAYER_SHUFFLE_PENDING: 'FETCH_PLAYER_SHUFFLE_PENDING',
  FETCH_PLAYER_SHUFFLE_FAILED: 'FETCH_PLAYER_SHUFFLE_FAILED',
  FETCH_PLAYER_SHUFFLE_FULFILLED: 'FETCH_PLAYER_SHUFFLE_FULFILLED',

  FETCH_PLAYER_TRACKS_PENDING: 'FETCH_PLAYER_TRACKS_PENDING',
  FETCH_PLAYER_TRACKS_FAILED: 'FETCH_PLAYER_TRACKS_FAILED',
  FETCH_PLAYER_TRACKS_FULFILLED: 'FETCH_PLAYER_TRACKS_FULFILLED',

  toggleQueue: () => ({
    type: playerActions.TOGGLE_QUEUE
  }),

  togglePlayRepeat: () => ({
    type: playerActions.TOGGLE_PLAY_REPEAT
  }),

  fetchPlayerShuffleRequestPending: (logAddress) => ({
    type: playerActions.FETCH_PLAYER_SHUFFLE_PENDING,
    payload: {
      logAddress
    }
  }),

  fetchPlayerShuffleRequestFailed: (logAddress, error) => ({
    type: playerActions.FETCH_PLAYER_SHUFFLE_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchPlayerShuffleRequestFulfilled: (logAddress, data) => ({
    type: playerActions.FETCH_PLAYER_SHUFFLE_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  fetchPlayerTracksRequestPending: logAddress => ({
    type: playerActions.FETCH_PLAYER_TRACKS_PENDING,
    payload: {
      logAddress
    }
  }),

  fetchPlayerTracksRequestFailed: (logAddress, error) => ({
    type: playerActions.FETCH_PLAYER_TRACKS_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  fetchPlayerTracksRequestFulfilled: (logAddress, data) => ({
    type: playerActions.FETCH_PLAYER_TRACKS_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  queueTrack: ({ trackId, playNext }) => ({
    type: playerActions.QUEUE_TRACK,
    payload: {
      trackId,
      playNext
    }
  }),

  unqueueTrack: ({ trackId, queueIndex }) => ({
    type: playerActions.UNQUEUE_TRACK,
    payload: {
      trackId,
      queueIndex
    }
  }),

  reorderQueue: ({ oldIndex, newIndex }) => ({
    type: playerActions.REORDER_QUEUE,
    payload: {
      oldIndex,
      newIndex
    }
  }),

  clearQueue: () => ({
    type: playerActions.CLEAR_QUEUE
  }),

  audioEnded: () => ({
    type: playerActions.AUDIO_ENDED
  }),

  audioPaused: () => ({
    type: playerActions.AUDIO_PAUSED
  }),

  audioPlaying: () => ({
    type: playerActions.AUDIO_PLAYING
  }),

  audioTimeUpdated: times => ({
    type: playerActions.AUDIO_TIME_UPDATED,
    payload: times
  }),

  audioVolumeChanged: volume => ({
    type: playerActions.AUDIO_VOLUME_CHANGED,
    payload: {
      volume
    }
  }),

  playPrevious: (trackId, tracklistPreviousTrackId) => ({
    type: playerActions.PLAY_PREVIOUS,
    payload: {
      trackId,
      tracklistPreviousTrackId
    }
  }),

  playNext: (trackId) => ({
    type: playerActions.PLAY_NEXT,
    payload: {
      trackId
    }
  }),

  // play from queue
  playQueueTrack: (queueIndex) => ({
    type: playerActions.PLAY_QUEUE_TRACK,
    payload: {
      queueIndex
    }
  }),

  // next, previous, audioEnd
  playTrack: (trackId) => ({
    type: playerActions.PLAY_TRACK,
    payload: {
      trackId
    }
  }),

  // play button
  playSelectedTrack: (trackId, tracklistAddress) => ({
    type: playerActions.PLAY_SELECTED_TRACK,
    payload: {
      trackId,
      tracklistAddress
    }
  }),

  // play button
  playTracklist: ({
    trackId,
    tracklistAddress,
    trackIds,
    tags,
    startIndex,
    hasMore,
    query
  }) => ({
    type: playerActions.PLAY_TRACKLIST,
    payload: {
      trackId,
      tracklistAddress,
      trackIds,
      tags,
      startIndex,
      hasMore,
      query
    }
  }),

  stopShuffle: () => ({
    type: playerActions.STOP_SHUFFLE
  }),

  shuffleSelectedTracklist: (tracklistAddress) => ({
    type: playerActions.SHUFFLE_SELECTED_TRACKLIST,
    payload: {
      tracklistAddress
    }
  }),

  shuffleTracklist: ({ tracklistAddress, tags, query }) => ({
    type: playerActions.SHUFFLE_TRACKLIST,
    payload: {
      tracklistAddress,
      tags,
      query
    }
  })
}

export const playerTracksRequestActions = {
  failed: playerActions.fetchPlayerTracksRequestFailed,
  fulfilled: playerActions.fetchPlayerTracksRequestFulfilled,
  pending: playerActions.fetchPlayerTracksRequestPending
}

export const playerShuffleRequestActions = {
  failed: playerActions.fetchPlayerShuffleRequestFailed,
  fulfilled: playerActions.fetchPlayerShuffleRequestFulfilled,
  pending: playerActions.fetchPlayerShuffleRequestPending
}
