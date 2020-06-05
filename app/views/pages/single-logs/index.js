import React from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'
import { shell } from 'electron'

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
import Icon from '@components/icon'
import { getHelp, helpActions } from '@core/help'
import IconButton from '@components/icon-button'
import { WIKI_URL } from '@core/constants'

class SingleLogsPage extends React.Component {
  constructor (props) {
    super(props)
    this._load()
  }

  componentDidUpdate (prevProps) {
    const { address } = this.props.match.params
    if (prevProps.match.params.address !== address) {
      this._load()
    }
  }

  _load () {
    const { address } = this.props.match.params
    this.props.loadLogs(address)
    this.props.loadLog(address)
  }

  render () {
    const { address } = this.props.match.params
    const {
      app,
      logs,
      displayLoadingIndicator,
      log,
      isMyLogsHelpVisible,
      toggleMyLogsHelp
    } = this.props

    const help = (
      <div>
        <div className='page__help-row'>
          <div className='page__help-lead'>Here you will see libraries you have linked to.</div>
        </div>
        <div className='page__help-row'>
          <Icon name='sync' />
          <div>To access a library you will first need to connect to it.</div>
        </div>
        <div className='page__help-row'>
          <Icon name='link' />
          <div>You should link to libraries you want to keep around.</div>
        </div>
        <div className='page__help-row'>
          <IconButton className='button__outline' icon='link' label='link' link='/link-log' />
          <div>If you have a library's address, you can add it directly.</div>
        </div>
        <a onClick={shell.openExternal.bind(null, WIKI_URL)} className='button button__text page__help-link'>Learn more</a>
      </div>
    )

    const head = <Log type='profile' log={log} />

    const isMyLoglist = address === app.address
    const body = <Loglist showAdd={isMyLoglist} {...{logs, displayLoadingIndicator, log}} />

    return (
      <PageLayout
        help={isMyLogsHelpVisible && isMyLoglist && help}
        onHelpClose={toggleMyLogsHelp}
        head={head}
        body={body}
      />
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  getCurrentLoglist,
  getLogsForCurrentLoglist,
  getCurrentLoglistLog,
  getHelp,
  (app, loglist, logs, log, help) => ({
    displayLoadingIndicator: loglist.isPending,
    logs,
    app,
    log,
    isMyLogsHelpVisible: help.isMyLogsHelpVisible
  })
)

const mapDispatchToProps = {
  loadLogs: loglistActions.loadLogs,
  loadLog: logActions.loadLog,
  toggleMyLogsHelp: helpActions.toggleMyLogsHelp
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SingleLogsPage)
