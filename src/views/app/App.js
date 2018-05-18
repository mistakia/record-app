import React from 'react'
import { Route, Switch, Link } from 'react-router-dom'
import { connect } from 'react-redux'

import HomePage from '@pages/home'
import TracksPage from '@pages/tracks'
import ContactsPage from '@pages/contacts'
import { dbActions } from '@core/db'


export class App extends React.Component {
  componentWillMount() {
    this.props.init()
  }

  render() {
    return (
      <div>
	<main className="main">
	  <ul>
	    <li><Link to='/'>Home</Link></li>
	    <li><Link to='/tracks/me'>My Tracks</Link></li>
	    <li><Link to='/contacts/me'>My Contacts</Link></li>
	  </ul>
	  <Switch>
	    <Route exact path='/' component={HomePage} />
	    <Route path='/tracks/:logId([0-9a-zA-Z\/]*)' component={TracksPage} />
	    <Route path='/contacts/:logId([0-9a-zA-Z\/]*)' component={ContactsPage} />
	  </Switch>
	</main>
      </div>
    )
  }
}

const mapDispatchToProps = {
  init: dbActions.init
}

export default connect(
  null,
  mapDispatchToProps
)(App)
