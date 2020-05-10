import React from 'react'

import IconButton from '@components/icon-button'

const EmptyMessage = ({
  disconnect,
  connect,
  log,
  address
}) => {
  if (!log || log.isReplicaating || log.address === address) {
    return <div className='list__body-empty'>Empty</div>
  }

  // TODO - move to own component
  const handleSyncClick = (e) => {
    e.stopPropagation()
    log.isReplicating
      ? disconnect(log.address, log.id)
      : connect(log.address, log.id)
  }

  const connectionStatusClassName = []
  if (log.isReplicating) {
    connectionStatusClassName.push('button__success')
    if (log.length < log.max) {
      connectionStatusClassName.push('spin')
    }
  }

  const connectionStatusAction = (
    <IconButton
      label='status'
      isLoading={log.isUpdating}
      className={connectionStatusClassName.join(' ')}
      onClick={handleSyncClick}
      icon='sync' />
  )

  return (
    <div className='list__body-empty'>
      <span>Empty. Try Syncing</span>
      {connectionStatusAction}
    </div>
  )
}

export default EmptyMessage
