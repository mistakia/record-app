import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { contextMenuActions } from '@core/context-menu'
import { tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import Tag from '@components/tag'
import history from '@core/history'
import Confirm from '@components/confirm'

import render from './tags'

class Tags extends React.Component {
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

  onClick ({ tag, address }) {
    const { tracklistAddress } = this.props
    // tags on tracks page
    if (!tracklistAddress) {
      return this.props.toggleTag(tag)
    }

    const currentPath = history.location.pathname
    if (currentPath === `/tracks${address}`) {
      this.props.toggleTag(tag)
    } else {
      history.push(`/tracks${address}?tags=${tag}`)
    }
  }

  getTagItems () {
    return this.props.track.tags.map(({ tag, address }, idx) => {
      if (!tag) {
        return null
      }

      const isExternal = address !== this.props.app.address
      return (
        <Tag
          key={idx}
          tag={tag}
          isExternal={isExternal}
          onClick={() => this.onClick({ tag, address })}
          remove={!isExternal && this.remove.bind(this, tag)}
        />
      )
    })
  }

  render () {
    return render.call(this)
  }
}

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ app })
)

const mapDispatchToProps = {
  toggleTag: tracklistActions.toggleTag,
  removeTag: taglistActions.removeTag,
  showContext: contextMenuActions.show
}

export default connect(mapStateToProps, mapDispatchToProps)(Tags)
