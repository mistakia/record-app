import React from 'react'

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
    <div>
      {tagItems}

      <div>
        {displayLoadingIndicator ? <LoadingIndicator /> : null}
      </div>
    </div>
  )
}
