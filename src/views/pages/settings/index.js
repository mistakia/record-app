import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getInfo, infoActions } from '@core/info'

import render from './settings'

class SettingsPage extends React.Component {
  constructor (props) {
    super(props)
    this.props.init()
  }

  render () {
    return render.call(this)
  }
}

const mapStateToProps = createSelector(
  getInfo,
  (info) => ({info})
)

const mapDispatchToProps = {
  init: infoActions.init
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsPage)
