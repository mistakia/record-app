import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore'
import NavigateNextIcon from '@material-ui/icons/NavigateNext'
import IconButton from '@material-ui/core/IconButton'
import SettingsIcon from '@material-ui/icons/Settings'
import LinkIcon from '@material-ui/icons/Link'

import Log from '@components/log'
import Status from '@components/status'
import history from '@core/history'

import './menu.styl'

const Menu = ({ app, log, logs }) => (
  <div id='menu' className='menu'>
    <div className='menu__top-section'>
      <IconButton onClick={history.back} size='small'>
        <NavigateBeforeIcon />
      </IconButton>
      <IconButton onClick={history.forward} size='small'>
        <NavigateNextIcon />
      </IconButton>
    </div>
    <div className='menu__main-section'>
      <div className='menu__section-heading'>
        <small>Record</small>
      </div>
      <NavLink to='/tracks' exact>Tracks</NavLink>
      <NavLink to='/listens'>Recently Played</NavLink>
      <div className='menu__section-heading'>
        <small>My Library</small>
      </div>
      <NavLink to={`/tracks${app.address}`}>Tracks</NavLink>
      <NavLink to={`/logs${app.address}`}>Libraries</NavLink>
    </div>
    <div className='menu__libraries-section'>
      <div className='menu__section-heading'>
        <small>Libraries</small>
        <IconButton component={Link} to='/link-log' size='small'>
          <LinkIcon />
        </IconButton>
      </div>
      {logs.map((log, index) => (
        <Log
          type='menu-item'
          log={log}
          key={index}
          active={history.location.pathname.includes(log.address)}
        />
      ))}
    </div>
    <div className='menu__bottom-section'>
      { log &&
        <IconButton component={Link} className={history.location.pathname === '/account' ? 'active' : undefined} to='/account'>
          <img src={log.avatar} />
        </IconButton>
      }
      <IconButton component={Link} className={history.location.pathname === '/settings' ? 'active' : undefined} to='/settings'>
        <SettingsIcon />
      </IconButton>
    </div>
    <Status />
  </div>
)

export default Menu
