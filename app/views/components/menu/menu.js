import React from 'react'
import { NavLink } from 'react-router-dom'

import IconButton from '@components/icon-button'
import history from '@core/history'

import './menu.styl'

const Menu = ({ app }) => (
  <div id='menu' className='menu'>
    <div className='menu__navigation'>
      <IconButton
        icon='arrow-back'
        label='go back'
        onClick={history.goBack}
        disabled={history.length < 2}
      />
      <IconButton
        icon='arrow-forward'
        label='go forward'
        onClick={history.goForward}
        disabled={history.length < 2}
      />
    </div>
    <NavLink to='/explore'>Libraries</NavLink>
    <NavLink to={`/tracks${app.address}`}>My Library</NavLink>
    <NavLink to='/info'>Info</NavLink>
  </div>
)

export default Menu
