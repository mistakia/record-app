export const playerActions = {
  AUDIO_ENDED: 'AUDIO_ENDED',
  AUDIO_PAUSED: 'AUDIO_PAUSED',
  AUDIO_PLAYING: 'AUDIO_PLAYING',
  AUDIO_TIME_UPDATED: 'AUDIO_TIME_UPDATED',
  AUDIO_VOLUME_CHANGED: 'AUDIO_VOLUME_CHANGED',
  PLAY_SELECTED_TRACK: 'PLAY_SELECTED_TRACK',
  SHUFFLE_TRACKLIST: 'SHUFFLE_TRACKLIST',
  PLAY_NEXT_TRACK: 'PLAY_NEXT_TRACK',
  STOP_SHUFFLE: 'STOP_SHUFFLE',

  QUEUE_TRACK: 'QUEUE_TRACK',
  UNQUEUE_TRACK: 'UNQUEUE_TRACK',

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

  playNextTrack: (trackId) => ({
    type: playerActions.PLAY_NEXT_TRACK,
    payload: {
      trackId
    }
  }),

  playSelectedTrack: (trackId, tracklistId) => ({
    type: playerActions.PLAY_SELECTED_TRACK,
    payload: {
      trackId,
      tracklistId
    }
  }),

  stopShuffle: () => ({
    type: playerActions.STOP_SHUFFLE
  }),

  shuffleTracklist: (tracklistId) => ({
    type: playerActions.SHUFFLE_TRACKLIST,
    payload: {
      tracklistId
    }
  })
}
