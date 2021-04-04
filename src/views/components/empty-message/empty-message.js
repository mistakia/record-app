import React from 'react'
import SyncIcon from '@material-ui/icons/Sync'
import IconButton from '@material-ui/core/IconButton'
import CircularProgress from '@material-ui/core/CircularProgress'

const EmptyMessage = ({
  disconnect,
  connect,
  log,
  address
}) => {
  if (!log || log.isReplicating || log.address === address) {
    return <div className='list__body-empty'>Empty</div>
  }

  // TODO - move to own component
  const handleConnectClick = (e) => {
    e.stopPropagation()
    log.isReplicating
      ? disconnect(log.address, log.id)
      : connect(log.address, log.id)
  }

  const connectionStatusAction = (
    <IconButton
      className={log.length < log.max ? 'spin' : undefined}
      onClick={handleConnectClick}
      disabled={log.isUpdating}
    >
      {log.isUpdating ? <CircularProgress size={24} /> : <SyncIcon />}
    </IconButton>
  )

  return (
    <div className='list__body-empty'>
      <span>Empty. Try Connecting</span>
      {connectionStatusAction}
    </div>
  )
}

export default EmptyMessage
