import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import TimeAgo from 'timeago-react'
import LinkIcon from '@material-ui/icons/Link'
import CircularProgress from '@material-ui/core/CircularProgress'
import EditIcon from '@material-ui/icons/Edit'
import SyncIcon from '@material-ui/icons/Sync'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'

import history from '@core/history'
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
    <Tooltip title='Link Library'>
      <IconButton
        component={Link}
        to={`/link-log${log.address}?alias=${log.name || log.alias || ''}`}>
        <LinkIcon />
      </IconButton>
    </Tooltip>
  )

  const unlinkAction = (
    <Tooltip title='Unlink Library'>
      <IconButton onClick={unlink} disabled={log.isUpdating} className='active'>
        {log.isUpdating ? <CircularProgress size={24} /> : <LinkIcon />}
      </IconButton>
    </Tooltip>
  )

  const editLog = (
    <Tooltip title='edit'>
      <IconButton
        component={Link}
        to={`/link-log${log.address}?isLinked=true&alias=${log.alias || log.name || ''}`}
        onClick={noPropagation}>
        <EditIcon />
      </IconButton>
    </Tooltip>
  )

  const editSelf = (
    <Tooltip title='edit'>
      <IconButton
        component={Link}
        to='/edit-about'
        onClick={noPropagation}>
        <EditIcon />
      </IconButton>
    </Tooltip>
  )

  const logAction = (log.isLinked
    ? unlinkAction
    : linkAction
  )

  const connectionStatusClassName = []
  if (log.isReplicating) {
    connectionStatusClassName.push('active')
    if (log.length < log.max) {
      connectionStatusClassName.push('spin')
    }
  }

  const connectionStatusAction = (
    <Tooltip title={log.isReplicating ? 'Disconnect' : 'Connect'}>
      <IconButton
        className={connectionStatusClassName.join(' ')}
        onClick={handleConnectClick}
        disabled={log.isUpdaitng}
      >
        {log.isUpdating ? <CircularProgress size={24} /> : <SyncIcon />}
      </IconButton>
    </Tooltip>
  )

  const viewUser = () => {
    history.push(tracksPath)
  }

  const actions = (
    <div className='log__actions'>
      {!log.isMe && logAction}
      {!log.isMe && connectionStatusAction}
      {showEdit && (log.isMe ? editSelf : editLog)}
    </div>
  )

  const more = (
    <div className='log__actions'>
      <IconButton onClick={handleMoreClick} className='log__action-more' size='small'>
        <MoreVertIcon />
      </IconButton>
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
        <div className='log__updated'>
          {log.latestHeadTimestamp && <TimeAgo datetime={log.latestHeadTimestamp} />}
        </div>
        <div className='log__metadata' data-label='entries'>
          {log.length < log.max && <Progress progress={(log.length / log.max) * 100} />}
          {log.length >= log.max
            ? (log.max > 0 && log.max)
            : (
              `${log.length}/${log.max}`
            )}
        </div>
        {type === 'profile' && <div className={'log__metadata' + (loading ? ' blink' : '')} data-label='tracks'>{log.trackCount}</div>}
        {type === 'profile' && <div className={'log__metadata' + (loading ? ' blink' : '')} data-label='libraries'>{log.logCount}</div>}
      </div>}
    </article>
  )
}

export default Log
