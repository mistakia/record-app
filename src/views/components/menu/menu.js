import React from 'react'
import { Link } from 'react-router-dom'

import './menu.styl'

const Menu = ({ app }) => (
  <div id='menu'>
    <ul>
      <li><Link to='/feed'>Home</Link></li>
      <li><Link to='/info'>Info</Link></li>
      <li><Link to={`/tracks${app.address}`}>Tracks</Link></li>
      <li><Link to={`/contacts${app.address}`}>Contacts</Link></li>
    </ul>
  </div>
)

export default Menu
