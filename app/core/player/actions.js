export const playerActions = {
  AUDIO_ENDED: 'AUDIO_ENDED',
  AUDIO_PAUSED: 'AUDIO_PAUSED',
  AUDIO_PLAYING: 'AUDIO_PLAYING',
  AUDIO_TIME_UPDATED: 'AUDIO_TIME_UPDATED',
  AUDIO_VOLUME_CHANGED: 'AUDIO_VOLUME_CHANGED',

  PLAY_TRACK: 'PLAY_TRACK',
  PLAY_TRACKLIST: 'PLAY_TRACKLIST',
  PLAY_SELECTED_TRACK: 'PLAY_SELECTED_TRACK',

  SHUFFLE_SELECTED_TRACKLIST: 'SHUFFLE_SELECTED_TRACKLIST',
  SHUFFLE_TRACKLIST: 'SHUFFLE_TRACKLIST',
  STOP_SHUFFLE: 'STOP_SHUFFLE',

  QUEUE_TRACK: 'QUEUE_TRACK',
  UNQUEUE_TRACK: 'UNQUEUE_TRACK',

  FETCH_PLAYER_SHUFFLE_PENDING: 'FETCH_PLAYER_SHUFFLE_PENDING',
  FETCH_PLAYER_SHUFFLE_FAILED: 'FETCH_PLAYER_SHUFFLE_FAILED',
  FETCH_PLAYER_SHUFFLE_FULFILLED: 'FETCH_PLAYER_SHUFFLE_FULFILLED',

  FETCH_PLAYER_TRACKS_PENDING: 'FETCH_PLAYER_TRACKS_PENDING',
  FETCH_PLAYER_TRACKS_FAILED: 'FETCH_PLAYER_TRACKS_FAILED',
  FETCH_PLAYER_TRACKS_FULFILLED: 'FETCH_PLAYER_TRACKS_FULFILLED',

  fetchPlayerShuffleRequestPending: (logId) => ({
    type: playerActions.FETCH_PLAYER_SHUFFLE_PENDING,
    payload: {
      logId
    }
  }),

  fetchPlayerShuffleRequestFailed: (logId, error) => ({
    type: playerActions.FETCH_PLAYER_SHUFFLE_FAILED,
    payload: {
      logId,
      error
    }
  }),

  fetchPlayerShuffleRequestFulfilled: (logId, data) => ({
    type: playerActions.FETCH_PLAYER_SHUFFLE_FULFILLED,
    payload: {
      logId,
      data
    }
  }),

  fetchPlayerTracksRequestPending: logId => ({
    type: playerActions.FETCH_PLAYER_TRACKS_PENDING,
    payload: {
      logId
    }
  }),

  fetchPlayerTracksRequestFailed: (logId, error) => ({
    type: playerActions.FETCH_PLAYER_TRACKS_FAILED,
    payload: {
      logId,
      error
    }
  }),

  fetchPlayerTracksRequestFulfilled: (logId, data) => ({
    type: playerActions.FETCH_PLAYER_TRACKS_FULFILLED,
    payload: {
      logId,
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

  // next, previous, audioEnd
  playTrack: (trackId) => ({
    type: playerActions.PLAY_TRACK,
    payload: {
      trackId
    }
  }),

  // play button
  playSelectedTrack: (trackId, tracklistId) => ({
    type: playerActions.PLAY_SELECTED_TRACK,
    payload: {
      trackId,
      tracklistId
    }
  }),

  // play button
  playTracklist: ({
    trackId,
    tracklistId,
    trackIds,
    tags,
    startIndex,
    hasMore,
    query
  }) => ({
    type: playerActions.PLAY_TRACKLIST,
    payload: {
      trackId,
      tracklistId,
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

  shuffleSelectedTracklist: (tracklistId) => ({
    type: playerActions.SHUFFLE_SELECTED_TRACKLIST,
    payload: {
      tracklistId
    }
  }),

  shuffleTracklist: ({ tracklistId, tags, query }) => ({
    type: playerActions.SHUFFLE_TRACKLIST,
    payload: {
      tracklistId,
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
