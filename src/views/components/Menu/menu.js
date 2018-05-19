import React from 'react'
import { Link } from 'react-router-dom'

import './menu.styl'

class Menu extends React.Component {
  render() {

    return (
      <div id='menu'>
	<ul>
	  <li><Link to='/'>Home</Link></li>
	  <li><Link to='/tracks/me'>My Tracks</Link></li>
	  <li><Link to='/contacts/me'>My Contacts</Link></li>
	</ul>
      </div>
    )
  }
}

export default Menu
