import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import TimeAgo from 'timeago-react'

import history from '@core/history'
import Icon from '@components/icon'
import IconButton from '@components/icon-button'
import Progress from '@components/progress'

import './log.styl'

const Log = ({
  connect,
  disconnect,
  logLocation,
  logBio,
  log,
  type,
  unlink,
  style,
  active,
  showContext
}) => {
  // const peers = log.peers.size
  const loading = log.isLoadingIndex || log.isProcessingIndex
  const showEdit = log.isMe || log.isLinked
  const noPropagation = e => e.stopPropagation()
  const tracksPath = `/tracks${log.address}`
  const logsPath = `/logs${log.address}`

  const handleMoreClick = (event) => {
    event && event.stopPropagation && event.stopPropagation()
    showContext({
      id: 'log',
      data: { address: log.address },
      clickX: event.clientX,
      clickY: event.clientY
    })
  }

  // TODO - move to own component
  const handleConnectClick = (e) => {
    e.stopPropagation()
    log.isReplicating
      ? disconnect(log.address, log.id)
      : connect(log.address, log.id)
  }

  const linkAction = (
    <Link
      className='button button__icon'
      onClick={noPropagation}
      to={`/link-log${log.address}?alias=${log.name || log.alias || ''}`}>
      <Icon name='link' />
    </Link>
  )

  const unlinkAction = (
    <IconButton className='button__success' onClick={unlink} isLoading={log.isUpdating} label='unlink' icon='link' />
  )

  const editLog = (
    <Link
      className='button__icon button log__edit-title'
      to={`/link-log${log.address}?isLinked=true&alias=${log.alias || log.name || ''}`}
      onClick={noPropagation}><Icon name='edit' /></Link>
  )

  const editSelf = (
    <Link
      className='button__icon button log__edit-title' to='/edit-about'
      onClick={noPropagation}>
      <Icon name='edit' /></Link>
  )

  const logAction = (log.isLinked
    ? unlinkAction
    : linkAction
  )

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
      onClick={handleConnectClick}
      icon='sync' />
  )

  const viewUser = () => {
    history.push(tracksPath)
  }

  const actions = (
    <div className='log__actions'>
      <div>{!log.isMe && logAction}</div>
      <div>{!log.isMe && connectionStatusAction}</div>
      <div>{showEdit && (log.isMe ? editSelf : editLog)}</div>
    </div>
  )

  const more = (
    <div className='log__actions'>
      <IconButton
        label='more'
        onClick={handleMoreClick}
        icon='more'
      />
    </div>
  )

  const classNames = ['log', `log__${type}`]

  if (active) {
    classNames.push('active')
  }

  return (
    <article
      className={classNames.join(' ')}
      style={style}
      onClick={type !== 'profile' ? viewUser : null}>
      <div className='log__main'>
        <div className='log__avatar'>
          <img src={log.avatar} />
        </div>
        <div className='log__title'>
          {log.logName}
          {log.isMe && <small>Owner</small>}
        </div>
        {type === 'menu-item' ? more : actions}
      </div>
      {type === 'profile' && <div className='log__menu menu'>
        <NavLink activeClassName='active' to={tracksPath}>Tracks</NavLink>
        <NavLink activeClassName='active' to={logsPath}>Libraries</NavLink>
      </div>}
      {type !== 'menu-item' && <div className='log__side'>
        <div>
          {log.latestHeadTimestamp && <TimeAgo datetime={log.latestHeadTimestamp} />}
        </div>
        <div data-label='entries'>
          {log.length < log.max && <Progress progress={(log.length / log.max) * 100} />}
          {log.length >= log.max
            ? (log.max > 0 && log.max)
            : (
              `${log.length}/${log.max}`
            )}
        </div>
        {type === 'profile' && <div className={loading ? 'blink' : ''} data-label='tracks'>{log.trackCount}</div>}
        {type === 'profile' && <div className={loading ? 'blink' : ''} data-label='libraries'>{log.logCount}</div>}
      </div>}
    </article>
  )
}

export default Log
