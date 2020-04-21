import React from 'react'
import { NavLink } from 'react-router-dom'

import IconButton from '@components/icon-button'
import history from '@core/history'

import './menu.styl'

const Menu = ({ app, log }) => (
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
    <NavLink to='/explore'>Home</NavLink>
    <NavLink to={`/tracks${app.address}`}>My Library</NavLink>
    <div className='menu__side'>
      <IconButton
        icon='settings'
        label='settings'
        navlink='/settings' />
      { log &&
        <NavLink className='menu__account' to='/account'>
          <img src={log.avatar} />
        </NavLink>
      }
    </div>
  </div>
)

export default Menu
