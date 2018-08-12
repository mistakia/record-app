import React from 'react'
import { Link } from 'react-router-dom'

import './menu.styl'

class Menu extends React.Component {
  render () {
    return (
      <div id='menu'>
        <ul>
          <li><Link to='/feed'>Home</Link></li>
          <li><Link to='/info'>Info</Link></li>
          <li><Link to='/tracks/me'>Tracks</Link></li>
          <li><Link to='/contacts/me'>Contacts</Link></li>
        </ul>
      </div>
    )
  }
}

export default Menu
