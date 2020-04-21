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

  onClick ({ tag, tracklistAddress }) {
    const { currentTracklistAddress } = this.props
    if (currentTracklistAddress === tracklistAddress) {
      this.props.toggleTag(tag)
    } else {
      history.push(`/tracks${tracklistAddress}?tags=${tag}`)
    }
  }

  getTagItems ({ tags, onClick, remove, tracklistAddress, isExternal }) {
    return tags.map((tag, idx) => {
      if (!tag) {
        return null
      }
      return (
        <Tag
          key={idx}
          tag={tag}
          isExternal={isExternal}
          onClick={onClick.bind(this, { tag, tracklistAddress })}
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
      tracklistAddress: this.props.app.address
    })
  }

  getExternalTagItems () {
    return this.getTagItems({
      tags: this.props.track.externalTags,
      onClick: this.onClick,
      tracklistAddress: this.props.tracklistAddress,
      isExternal: true
    })
  }
}

export default TagsBase
