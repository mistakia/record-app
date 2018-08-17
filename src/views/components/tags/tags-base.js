import React from 'react'

import Tag from '@components/tag'
import { fuzzyFilter } from '@core/utils'
import history from '@core/history'

class TagsBase extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      tag: ''
    }
  }

  add (tag = this.state.tag) {
    const { track } = this.props
    this.props.addTag('/me', { track, tag })
    this.setState({ tag: '' })
  }

  remove (tag) {
    const { track } = this.props
    const trackId = track.id
    tag = tag || track.tags[track.tags.length - 1]
    this.props.removeTag('/me', { trackId, tag })
  }

  onClick (tag) {
    history.push(`/tracks/me?tags=${tag}`)
  }

  getTagItems (tags, onClick, remove) {
    return tags.map((tag, idx) =>
      tag && <Tag key={idx} tag={tag} onClick={onClick.bind(this, tag)} remove={remove && remove.bind(this, tag)} />
    )
  }

  getCurrentTagItems () {
    return this.getTagItems(this.props.track.tags, this.onClick, this.remove)
  }

  getSuggestedTagItems () {
    if (!this.state.tag) {
      return
    }

    const suggestedTags = fuzzyFilter(this.props.tags, this.state.tag)
    return this.getTagItems(suggestedTags, this.add)
  }
}

export default TagsBase
