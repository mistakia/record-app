import { connect } from 'react-redux'

import { loglistActions } from '@core/loglists'
import { logActions } from '@core/logs'
import { contextMenuActions } from '@core/context-menu'
import { dialogActions } from '@core/dialogs'

import Log from './log'

const LogBase = ({ unlinkLog, log, showDialog, ...props }) => {
  if (!log) {
    return null
  }

  const logLocation = log.isMe
    ? (log.location || 'Location')
    : log.location

  const logBio = log.isMe
    ? (log.bio || 'Bio')
    : log.bio

  const unlink = (event) => {
    event && event.stopPropagation && event.stopPropagation()
    showDialog({
      message: `Are you sure you want to unsave ${log.logName}`,
      detail: 'Unlinking this library will eventually remove its data from your device',
      onConfirm: () => unlinkLog(log.address)
    })
  }

  return Log({
    log,
    unlink,
    logLocation,
    logBio,
    ...props
  })
}

const mapDispatchToProps = {
  unlinkLog: loglistActions.unlinkLog,
  connect: logActions.connectLog,
  disconnect: logActions.disconnectLog,
  showContext: contextMenuActions.show,
  showDialog: dialogActions.show
}

export default connect(
  null,
  mapDispatchToProps
)(LogBase)
