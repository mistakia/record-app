import React from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'

import { getApp } from '@core/app'
import {
  loglistActions,
  getCurrentLoglist,
  getCurrentLoglistLog,
  getLogsForCurrentLoglist
} from '@core/loglists'
import { logActions } from '@core/logs'
import Loglist from '@components/loglist'
import PageLayout from '@layouts/page'
import Log from '@components/log'

class LogsPage extends React.Component {
  constructor (props) {
    super(props)
    this._load()
  }

  componentDidUpdate (prevProps) {
    const { logAddress } = this.props.match.params
    if (prevProps.match.params.logAddress !== logAddress) {
      this._load()
    }
  }

  _load () {
    const { logAddress } = this.props.match.params
    this.props.loadLogs(logAddress)
    this.props.loadLog(logAddress)
  }

  render () {
    const { logAddress } = this.props.match.params
    const { app, logs, displayLoadingIndicator, log } = this.props

    const head = <Log type='profile' log={log} />

    const showAdd = logAddress === app.address
    const body = <Loglist {...{logs, displayLoadingIndicator, showAdd, log}} />

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  getCurrentLoglist,
  getLogsForCurrentLoglist,
  getCurrentLoglistLog,
  (app, loglist, logs, log) => ({
    displayLoadingIndicator: loglist.isPending,
    logs,
    app,
    log
  })
)

const mapDispatchToProps = {
  loadLogs: loglistActions.loadLogs,
  loadLog: logActions.loadLog
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LogsPage)
