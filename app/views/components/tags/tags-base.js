import React from 'react'

import Tag from '@components/tag'
import history from '@core/history'
import Confirm from '@components/confirm'

class TagsBase extends React.Component {
  remove (tag) {
    const { track, app } = this.props
    const trackId = track.id
    tag = tag || track.tags[track.tags.length - 1]
    Confirm({
      title: 'Delete Tag',
      message: `Are you sure you want to delete the tag: ${tag}`,
      onConfirm: () => this.props.removeTag(app.address, { trackId, tag })
    })
  }

  onClick ({ tag, tracklistId }) {
    history.push(`/tracks${tracklistId}?tags=${tag}`)
  }

  getTagItems ({ tags, onClick, remove, tracklistId, isExternal }) {
    return tags.map((tag, idx) => {
      if (!tag) {
        return null
      }
      return (
        <Tag
          key={idx}
          tag={tag}
          isExternal={isExternal}
          onClick={onClick.bind(this, { tag, tracklistId })}
          remove={remove && remove.bind(this, tag)}
        />
      )
    })
  }

  getCurrentTagItems () {
    return this.getTagItems({
      tags: this.props.track.tags,
      onClick: this.onClick,
      remove: this.remove,
      tracklistId: this.props.app.address
    })
  }

  getExternalTagItems () {
    return this.getTagItems({
      tags: this.props.track.externalTags,
      onClick: this.onClick,
      tracklistId: this.props.tracklistId,
      isExternal: true
    })
  }
}

export default TagsBase
