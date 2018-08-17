import React from 'react'
import { View, StyleSheet } from 'react-native'

import LoadingIndicator from '@components/loading-indicator'
import Tag from '@components/tag'

export default function Taglist ({
  displayLoadingIndicator,
  selectedTags,
  toggleTag,
  tags
}) {
  const tagItems = tags.map((tag, index) => {
    const isSelected = selectedTags.includes(tag.tag)
    return (
      <Tag
        key={index}
        tag={tag.tag}
        isSelected={isSelected}
        onClick={toggleTag.bind(null, tag.tag)}
        count={tag.count}
      />
    )
  })

  return (
    <View style={styles.tagsContainer}>
      {tagItems}
      <View>
        {displayLoadingIndicator ? <LoadingIndicator /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tagsContainer: {
    padding: 5,
    flex: 1,
    flexWrap: 'wrap',
    flexDirection: 'row'
  }
})
