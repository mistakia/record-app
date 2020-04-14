import React from 'react'

import { fuzzyFilter } from '@core/utils'

export class TagContextMenu extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      tag: '',
      suggestedTags: []
    }
    this.handleChange = this.handleChange.bind(this)
    this.handleKeyPress = this.handleKeyPress.bind(this)
  }

  componentDidMount () {
    this.input.focus()
  }

  handleKeyPress (event) {
    if (!this.state.tag) {
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      const suggestedTag = this.state.suggestedTags.first()
      if (suggestedTag) this.add({ tag: suggestedTag })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      this.add({ tag: this.state.tag })
    }
  }

  handleChange (event) {
    const suggestedTags = fuzzyFilter(this.props.tags, this.state.tag)
    this.setState({ tag: event.target.value.toLowerCase(), suggestedTags })
  }

  add ({ tag }) {
    if (!tag) return
    const { track, app } = this.props
    this.props.addTag(app.address, { cid: track.contentCID, tag })
    this.setState({ tag: '' })
  }

  getSuggestedTagItems () {
    if (!this.state.tag || !this.state.suggestedTags.size) {
      return null
    }

    return this.state.suggestedTags.map((tag, idx) => {
      return (
        <div
          key={idx}
          className='context-menu--option'
          onClick={() => this.add({ tag })}>
          { tag }
        </div>
      )
    })
  }

  render () {
    return (
      <div>
        <div className='context-menu--input'>
          <input
            ref={(input) => { this.input = input }}
            type='text'
            className='input cursor'
            value={this.state.tag}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyPress}
            placeholder='Enter Tag Name'
          />
        </div>
        <div className='context-menu--separator' />
        {this.getSuggestedTagItems()}
      </div>
    )
  }
}

export default TagContextMenu
