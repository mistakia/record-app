import React from 'react'
import { Link } from 'react-router-dom'

import './menu.styl'

const Menu = ({ app }) => (
  <div id='menu'>
    <Link to='/feed'>Home</Link>
    <Link to='/explore'>Explore</Link>
    <Link to='/info'>Info</Link>
    <Link to={`/tracks${app.address}`}>Tracks</Link>
  </div>
)

export default Menu
