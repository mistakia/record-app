import React from 'react'
import { NavLink } from 'react-router-dom'

import Log from '@components/log'
import IconButton from '@components/icon-button'
import history from '@core/history'

import './menu.styl'

const Menu = ({ app, log, logs }) => (
  <div id='menu' className='menu'>
    <div className='menu__top-section'>
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
    <div className='menu__main-section'>
      <small>Record</small>
      <NavLink to='/tracks' exact>Tracks</NavLink>
      <NavLink to='/listens'>Recently Played</NavLink>
      <small>My Library</small>
      <NavLink to={`/tracks${app.address}`}>Tracks</NavLink>
      <NavLink to={`/logs${app.address}`}>Libraries</NavLink>
    </div>
    <div className='menu__libraries-section'>
      <small>Libraries</small>
      {logs.map((log, index) => (
        <Log type='menu-item' log={log} key={index} />
      ))}
    </div>
    <div className='menu__bottom-section'>
      { log &&
        <NavLink className='menu__account' to='/account'>
          <img src={log.avatar} />
        </NavLink>
      }
      <IconButton
        icon='settings'
        label='settings'
        navlink='/settings' />
    </div>
  </div>
)

export default Menu
