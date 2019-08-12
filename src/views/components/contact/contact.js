import React from 'react'
import { Link, NavLink } from 'react-router-dom'

import history from '@core/history'
import Button from '@components/button'
import Progress from '@components/progress'

import './contact.styl'

const Contact = ({
  contactName,
  contactLocation,
  contactBio,
  contact,
  type,
  disconnect,
  style
}) => {
  const noPropagation = e => e.stopPropagation()
  const connectAction = (
    <Link
      className='button'
      onClick={noPropagation}
      to={`/new-contact${contact.address}?alias=${contact.name || contact.alias}`}>
      Connect
    </Link>
  )

  const disconnectAction = (
    <Button onClick={disconnect} isLoading={contact.isUpdating}>Disconnect</Button>
  )

  const selfAction = (
    <Link
      className='button' to='/edit-about'
      onClick={noPropagation}>
      Edit</Link>
  )

  const contactAction = (contact.isMe
    ? selfAction
    : (contact.haveContact
      ? disconnectAction
      : connectAction
    )
  )

  const viewUser = () => {
    history.push(`/tracks${contact.address}`)
  }

  const peers = contact.peers.size

  const loading = contact.isBuildingIndex || contact.isProcessingIndex

  return (
    <article
      className={`contact contact__${type}`}
      style={style}
      onClick={type !== 'profile' ? viewUser : null}>
      <div className='contact__avatar'>
        <img src={contact.avatar} />
      </div>
      <div className='contact__body'>
        <div className='contact__title'>
          {contactName}
        </div>
        { type === 'profile' && <div className='contact__menu menu'>
          <NavLink activeClassName='active' to={`/tracks${contact.address}`}>Tracks</NavLink>
          <NavLink activeClassName='active' to={`/contacts${contact.address}`}>Contacts</NavLink>
        </div> }
        <div data-label='peers'>{peers}</div>
        <div data-label='entries'>{contact.length === contact.max
          ? contact.max
          : (
            `${contact.length}/${contact.max}`
          )}{contact.length !== contact.max && <Progress progress={(contact.length / contact.max) * 100} />}</div>
        <div className={loading ? 'blink' : ''} data-label='tracks'>{contact.trackCount}</div>
        <div className={loading ? 'blink' : ''} data-label='contacts'>{contact.contactCount}</div>
      </div>
      <div className='contact__actions'>
        {type !== 'heading' && contactAction}
      </div>
    </article>
  )
}

export default Contact
