import React from 'react'
import { Link, NavLink } from 'react-router-dom'

import Button from '@components/button'

import './contact.styl'

const Contact = ({ contact, type, removeContact }) => {
  removeContact = removeContact.bind(null, { contactId: contact.id })
  return (
    <article className={`contact contact__${type}`}>
      <img className='contact__avatar' src={contact.avatar} />
      <div className='contact__body'>
        <Link to={`/tracks${contact.address}`} className='contact__title'>
          { contact.isMe ?
            (contact.name || 'set your name' ) :
            (contact.alias || contact.name) }
        </Link>
        { (contact.isMe || contact.location) && <small>
          { contact.isMe ?
            (contact.location || 'set your location') :
            contact.location}
        </small> }
        <small>{contact.address}</small>
        { (type === 'profile' && (contact.isMe || contact.bio)) && <div className='contact__bio'>
          { contact.isMe ?
            (contact.bio || 'set your bio') :
            contact.bio }
        </div> }
        <div className='contact__action'>
          {type !== 'heading' && (contact.isMe ?
            <Link className='button' to='/edit-profile'>Edit</Link> : (contact.haveContact ?
              <Button className='button' onClick={removeContact}>Disconnect</Button> :
              <Link
                className='button'
                to={`/contacts/new/${contact.address}?alias=${contact.name || contact.alias}`}>
                Connect
              </Link>
            )
          )}
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
