import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

import AudioCurrentTime from '@components/audio-current-time'
import AudioTimeline from '@components/audio-timeline'
import IconButton from '@components/icon-button'

export default function Player ({
  decreaseVolume,
  increaseVolume,
  isPlaying,
  nextTrack,
  pause,
  play,
  previousTrack,
  track,
  volume
}) {
  if (!track) return null

  return (
    <View style={styles.player}>
      <AudioTimeline />
      <Text style={styles.text}>{track.title}</Text>
      <IconButton
        style={styles.playContainer}
        iconStyle={styles.play}
        icon={isPlaying ? 'ios-pause' : 'ios-play'}
        onClick={isPlaying ? pause : play}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  player: {
    ...StyleSheet.absoluteFillObject,
    top: 'auto',
    bottom: 50,
    height: 40,
    backgroundColor: '#666',
    zIndex: 1
  },
  text: {
    ...StyleSheet.absoluteFillObject,
    left: 40,
    right: 40,
    textAlign: 'center',
    lineHeight: 40,
    fontSize: 8,
    color: '#f0f0f0'
  },
  playContainer: {
    ...StyleSheet.absoluteFillObject,
    left: 'auto',
    height: '100%',
    width: 40
  },
  play: {
    color: '#f0f0f0',
    lineHeight: 40,
    textAlign: 'center',
    fontSize: 24
  }
})
