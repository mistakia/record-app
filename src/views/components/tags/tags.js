import React from 'react'

import TagsBase from './tags-base'

import './tags.styl'

class Tags extends TagsBase {
  constructor (props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
    this.handleKeyPress = this.handleKeyPress.bind(this)
  }

  handleKeyPress (event) {
    if (event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault()
      this.add()
    } else if (!this.state.tag && event.key === 'Backspace' && this.props.track.tags.length) {
      event.preventDefault()
      this.remove()
    }
  }

  handleChange (event) {
    this.setState({ tag: event.target.value.toLowerCase() })
  }

  render () {
    return (
      <div className='track__tags'>
        <div className='current'>
          {this.getCurrentTagItems()}
          <input
            type='text'
            className='input cursor'
            value={this.state.tag}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyPress}
            placeholder='+Tag'
          />
        </div>
        <div className='new'>{this.getSuggestedTagItems()}</div>
      </div>
    )
  }
}

export default Tags
