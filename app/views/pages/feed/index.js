import React from 'react'
import { connect } from 'react-redux'

import { feedActions } from '@core/feed'

import render from './feed'

class FeedPage extends React.Component {
  componentWillMount () {
    this._load()
  }

  _load () {
    this.props.loadFeed()
  }

  render () {
    return render.call(this)
  }
}

const mapDispatchToProps = {
  loadFeed: feedActions.loadFeed
}

export default connect(
  null,
  mapDispatchToProps
)(FeedPage)
