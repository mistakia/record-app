import React from 'react'
import { NavLink } from 'react-router-dom'

import './menu.styl'

const Menu = ({ app }) => (
  <div id='menu' className='menu'>
    <NavLink to='/feed'>Home</NavLink>
    <NavLink to='/explore'>Explore</NavLink>
    <NavLink to='/info'>Info</NavLink>
    <NavLink to={`/tracks${app.address}`}>Tracks</NavLink>
  </div>
)

export default Menu
