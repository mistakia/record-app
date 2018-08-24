import React from 'react'
import { Text, StyleSheet } from 'react-native'

import Button from '@components/button'
import LoadingIndicator from '@components/loading-indicator'

const Loading = ({
  hasMore,
  loading,
  onClick
}) => {
  if (loading) {
    return <LoadingIndicator style={styles.loadingContainer}/>
  }

  if (hasMore) {
    return (
      <Button
        onClick={onClick}
        style={styles.loadingContainer}>
        <Text>Load More</Text>
      </Button>
    )
  }

  return null
}

const styles = StyleSheet.create({
  loadingContainer: {
    marginTop: 30,
    marginBottom: 20,
    marginLeft: 15,
    marginRight: 15
  }
})

export default Loading
