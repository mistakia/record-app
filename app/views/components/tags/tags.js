import React from 'react'

import TagsBase from './tags-base'

import './tags.styl'

class Tags extends TagsBase {
  render () {
    return (
      <div className='tags'>
        {this.getCurrentTagItems()}
        {this.getExternalTagItems()}
      </div>
    )
  }
}

export default Tags
