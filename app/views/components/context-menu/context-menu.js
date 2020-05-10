import React from 'react'

import TrackContextMenu from '@components/track-context-menu'
import TagContextMenu from '@components/tag-context-menu'
import UrlContextMenu from '@components/url-context-menu'

import './context-menu.styl'

export class ContextMenu extends React.Component {
  constructor () {
    super()

    this._handleClick = this._handleClick.bind(this)
  }

  _handleClick (event) {
    const { visible } = this.props.contextMenuInfo
    if (!visible) {
      return
    }

    const wasOutside = !this.root.contains(event.target)
    if (wasOutside) {
      this.props.hide()
    }
  }

  _removeListeners () {
    document.removeEventListener('click', this._handleClick)
  }

  _addListeners () {
    document.addEventListener('click', this._handleClick)
  }

  componentWillUnmount () {
    this._removeListeners()
  }

  componentDidUpdate () {
    const { id, visible, clickX, clickY } = this.props.contextMenuInfo

    if (!visible || !this.root) {
      return this._removeListeners()
    }

    this._addListeners()

    const rootW = this.root.offsetWidth
    const rootH = this.root.offsetHeight
    const screenW = window.innerWidth
    const screenH = window.innerHeight

    if (id === 'tag' || id === 'url') {
      this.root.style.top = `${(screenH / 2) - (rootH / 2)}px`
      this.root.style.left = `${(screenW / 2) - (rootW / 2)}px`
      return
    }

    const right = (screenW - clickX) > rootW
    const left = !right
    const top = (screenH - clickY) > rootH
    const bottom = !top

    if (right) {
      this.root.style.left = `${clickX + 5}px`
    }

    if (left) {
      this.root.style.left = `${clickX - rootW - 5}px`
    }

    if (top) {
      this.root.style.top = `${clickY + 5}px`
    }

    if (bottom) {
      this.root.style.top = `${clickY - rootH - 5}px`
    }
  }

  render () {
    const { visible, id, data } = this.props.contextMenuInfo

    if (!visible) {
      return null
    }

    const getContextMenuComponent = (id) => {
      switch (id) {
        case 'track': return TrackContextMenu
        case 'tag': return TagContextMenu
        case 'url': return UrlContextMenu
      }
    }

    const ContextMenuComponent = getContextMenuComponent(id)

    return (
      <div ref={ref => { this.root = ref }} className='context-menu'>
        <ContextMenuComponent data={data} />
      </div>
    )
  }
}

export default ContextMenu
