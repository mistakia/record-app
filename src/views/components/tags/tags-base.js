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
    const { track, app } = this.props
    this.props.addTag(app.address, { cid: track.contentCID, tag })
    this.setState({ tag: '' })
  }

  remove (tag) {
    const { track, app } = this.props
    const trackId = track.id
    tag = tag || track.tags[track.tags.length - 1]
    this.props.removeTag(app.address, { trackId, tag })
  }

  onClick (tag) {
    const { app } = this.props
    history.push(`/tracks${app.address}?tags=${tag}`)
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
