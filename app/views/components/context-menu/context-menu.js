import React from 'react'

import TrackContextMenu from '@components/track-context-menu'
import TagContextMenu from '@components/tag-context-menu'

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
      this._removeListeners()
    }
  }

  _removeListeners () {
    document.removeEventListener('click', this._handleClick)
  }

  _addListeners () {
    document.addEventListener('click', this._handleClick)
  }

  componentWillUnmount() {
    this._removeListeners()
  }

  componentDidUpdate (prevProps) {
    const { visible, clickX, clickY } = this.props.contextMenuInfo

    if (!visible || prevProps.contextMenuInfo.visible || !this.root) {
      return
    }

    const screenW = window.innerWidth
    const screenH = window.innerHeight
    const rootW = this.root.offsetWidth
    const rootH = this.root.offsetHeight

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

    this._addListeners()
  }

  render() {
    const { visible, id, data } = this.props.contextMenuInfo

    if (!visible)
      return null

    const getContextMenuComponent = (id) => {
      switch (id) {
        case 'track': return TrackContextMenu
        case 'tag': return TagContextMenu
      }
    }

    const ContextMenuComponent = getContextMenuComponent(id)

    return (
      <div ref={ref => {this.root = ref}} className='context-menu'>
        <ContextMenuComponent data={data} />
      </div>
    )
  }
}

export default ContextMenu
