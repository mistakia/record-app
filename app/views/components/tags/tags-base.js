import React from 'react'

import Tag from '@components/tag'
import { fuzzyFilter } from '@core/utils'
import history from '@core/history'
import Confirm from '@components/confirm'

class TagsBase extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      tag: ''
    }
  }

  add ({ tag }) {
    if (!tag) return
    const { track, app } = this.props
    this.props.addTag(app.address, { cid: track.contentCID, tag })
    this.setState({ tag: '' })
  }

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
    if (this.state.tag) {
      return
    }

    return this.getTagItems({
      tags: this.props.track.tags,
      onClick: this.onClick,
      remove: this.remove,
      tracklistId: this.props.app.address
    })
  }

  getExternalTagItems () {
    if (this.state.tag) {
      return
    }

    return this.getTagItems({
      tags: this.props.track.externalTags,
      onClick: this.onClick,
      tracklistId: this.props.tracklistId,
      isExternal: true
    })
  }

  getSuggestedTagItems () {
    if (!this.state.tag) {
      return
    }

    const suggestedTags = fuzzyFilter(this.props.tags, this.state.tag)
    return this.getTagItems({
      tags: suggestedTags,
      onClick: this.add
    })
  }
}

export default TagsBase
