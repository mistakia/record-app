import React from 'react'
import { Route, Switch } from 'react-router-dom'
import { connect } from 'react-redux'

import Menu from '@components/Menu'
import HomePage from '@pages/home'
import TracksPage from '@pages/tracks'
import ContactsPage from '@pages/contacts'
import { dbActions } from '@core/db'

import 'normalize.css'
import './App.styl'

export class App extends React.Component {
  componentWillMount() {
    this.props.init()
  }

  render() {
    return (
      <div>
	<main className="main">
	  <Menu />
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
