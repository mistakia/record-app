import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentTaglist,
  getTagsForCurrentTaglist
} from '@core/taglists'
import { tracklistActions, getCurrentSelectedTags } from '@core/tracklists'
import LoadingIndicator from '@components/loading-indicator'
import Tag from '@components/tag'

import render from './taglist'

const Taglist = ({
  displayLoadingIndicator,
  selectedTags,
  toggleTag,
  tags
}) => {
  if (!tags.size) return null

  const sortedTags = tags.sortBy(item => item.tag)
  const tagItems = sortedTags.map((tag, index) => {
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

  const loading = (displayLoadingIndicator && <LoadingIndicator />)

  return render(tagItems, loading)
}

const mapStateToProps = createSelector(
  getCurrentTaglist,
  getCurrentSelectedTags,
  getTagsForCurrentTaglist,
  (taglist, selectedTags, tags) => ({
    displayLoadingIndicator: taglist.isPending,
    selectedTags,
    tags
  })
)

const mapDispatchToProps = {
  toggleTag: tracklistActions.toggleTag
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Taglist)
