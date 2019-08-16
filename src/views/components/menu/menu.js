import React from 'react'
import { NavLink } from 'react-router-dom'

import './menu.styl'

const Menu = ({ app }) => (
  <div id='menu' className='menu'>
    <NavLink to='/explore'>Explore</NavLink>
    <NavLink to={`/tracks${app.address}`}>Library</NavLink>
    <NavLink to='/info'>Info</NavLink>
  </div>
)

export default Menu
