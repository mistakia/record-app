import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentTaglist,
  getTagsForCurrentTaglist
} from '@core/taglists'
import { tracklistActions, getCurrentTracklist } from '@core/tracklists'
import Tag from '@components/tag'

import render from './taglist'

const Taglist = ({
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

  return render(tagItems)
}

const mapStateToProps = createSelector(
  getCurrentTaglist,
  getCurrentTracklist,
  getTagsForCurrentTaglist,
  (taglist, tracklist, tags) => ({
    displayLoadingIndicator: taglist.isPending,
    selectedTags: tracklist.tags.toJS(),
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
