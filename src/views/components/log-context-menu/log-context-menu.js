import React from 'react'

import { copyToClipboard } from '@core/utils'
import history from '@core/history'

export class LogContextMenu extends React.Component {
  render () {
    const { unlinkLog, log, connect, disconnect, hide, showDialog } = this.props

    const showEdit = log.isMe || log.isLinked

    const handleConnectClick = () => log.isReplicating
      ? disconnect(log.address, log.id)
      : connect(log.address, log.id)

    const unlink = (event) => {
      event && event.stopPropagation && event.stopPropagation()
      showDialog({
        message: `Are you sure you want to unsave ${log.logName}`,
        detail: 'Unlinking this library will eventually remove its data from your device',
        onConfirm: () => unlinkLog(log.address)
      })
    }

    const handleLinkClick = (e) => log.isLinked
      ? unlink(e)
      : history.push(`/link-log${log.address}?alias=${log.name || log.alias || ''}`)

    const handleEditClick = () => log.isMe
      ? history.push('/edit-about')
      : history.push(`/link-log${log.address}?isLinked=true&alias=${log.alias || log.name || ''}`)

    return (
      <div>
        {!log.isMe && <div
          className='context-menu--option'
          onClick={() => { handleConnectClick(); hide() }}>
          {log.isReplicating ? 'Disconnect' : 'Connect'}</div>}
        {!log.isMe && <div
          className='context-menu--option'
          onClick={(e) => { handleLinkClick(e); hide() }}>
          {log.isLinked ? 'Unlink' : 'Link'}</div>}
        {showEdit && <div
          className='context-menu--option'
          onClick={() => { handleEditClick(); hide() }}>
          Edit</div>}
        <div
          className='context-menu--option'
          onClick={() => { copyToClipboard(log.address); hide() }}>
          Copy Address</div>
      </div>
    )
  }
}

export default LogContextMenu
