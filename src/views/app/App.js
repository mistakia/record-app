import React from 'react'
import { Route } from 'react-router-dom'
import { connect } from 'react-redux'

import HomePage from '@pages/home'
import { dbActions } from '@core/db'

export class App extends React.Component {
  componentWillMount() {
    this.props.init()
  }

  render() {
    return (
      <div>
	<main className="main">
	  <Route exact path='/' component={HomePage} />
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
