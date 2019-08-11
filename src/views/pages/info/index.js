import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp, appActions } from '@core/app'
import { getInfo, infoActions } from '@core/info'

import render from './info'

class InfoPage extends React.Component {
  componentWillMount () {
    this.props.init()
  }

  render () {
    return render.call(this)
  }
}

const mapStateToProps = createSelector(
  getInfo,
  getApp,
  (info, app) => ({info, app})
)

const mapDispatchToProps = {
  init: infoActions.init,
  getPrivateKey: appActions.getPrivateKey
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InfoPage)
