import React from 'react'

import Tag from '@components/tag'
import { fuzzyFilter } from '@core/utils'

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

  defaultOnClick (tag) {
    console.log(`change page to /:logId/tracks/${tag}`)
  }

  getTagItems (tags, onClick = this.defaultOnClick) {
    return tags.map((tag, idx) =>
      tag && <Tag key={idx} tag={tag} onClick={onClick.bind(this, tag)} remove={this.remove.bind(this, tag)} />
    )
  }

  getCurrentTagItems () {
    return this.getTagItems(this.props.track.tags)
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
