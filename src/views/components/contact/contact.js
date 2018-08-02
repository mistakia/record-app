import React from 'react'
import { Link } from 'react-router-dom'

class Contact extends React.Component {
  render () {
    const { contact } = this.props
    return (
      <article>
        <strong>Alias: {contact.alias}</strong>
        <p>Address: {contact.address}</p>
        <ul>
          <li><Link to={`/tracks${contact.address}`}>Tracks</Link></li>
        </ul>
      </article>
    )
  }
}

export default Contact
