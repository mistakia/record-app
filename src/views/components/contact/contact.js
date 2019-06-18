import React from 'react'
import { Link, NavLink } from 'react-router-dom'

import history from '@core/history'
import Button from '@components/button'

import './contact.styl'

const Contact = ({
  contactName,
  contactLocation,
  contactBio,
  contact,
  type,
  disconnect
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
    <Button className='button' onClick={disconnect}>Disconnect</Button>
  )

  const selfAction = (
    <Link className='button' to='/edit-about'>Edit</Link>
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

  return (
    <article
      className={`contact contact__${type}`}
      onClick={type !== 'profile' ? viewUser : null}>
      <img className='contact__avatar' src={contact.avatar} />
      <div className='contact__body'>
        <div className='contact__title'>
          {contactName}
        </div>
        {contactLocation && <small>{contactLocation}</small>}
        {(type === 'profile' && contactBio) && <div className='contact__bio'>
          {contactBio}
        </div> }
        <div className='contact__action'>
          {type !== 'heading' && contactAction}
        </div>
      </div>
      { type === 'profile' && <div className='contact__menu'>
        <NavLink activeClassName='active' to={`/tracks${contact.address}`}>Tracks</NavLink>
        <NavLink activeClassName='active' to={`/contacts${contact.address}`}>Contacts</NavLink>
      </div> }
    </article>
  )
}

export default Contact
