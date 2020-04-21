import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  loglistActions,
  getAllLoglist
} from '@core/loglists'
import { getHelp, helpActions } from '@core/help'
import { getAllLogs } from '@core/logs'

import render from './explore'

class ExplorePage extends React.Component {
  constructor (props) {
    super(props)
    this._load()
  }

  _load () {
    this.props.loadPeerLogs()
    this.props.loadAllLogs()
  }

  render () {
    return render.call(this)
  }
}

const mapStateToProps = createSelector(
  getAllLogs,
  getAllLoglist,
  getHelp,
  (logs, allLoglist, help) => ({
    logs,
    allLoglist,
    isHomeHelpVisible: help.isHomeHelpVisible
  })
)

const mapDispatchToProps = {
  loadAllLogs: loglistActions.loadAllLogs,
  loadPeerLogs: loglistActions.loadPeerLogs,
  toggleHomeHelp: helpActions.toggleHomeHelp
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExplorePage)
