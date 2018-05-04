import React from 'react'
import { Route } from 'react-router-dom'
import { connect } from 'react-redux'

import TracksPage from '@pages/tracks'
import { dbActions } from '@core/db'


export class App extends React.Component {
  componentWillMount() {
    this.props.init()
  }

  render() {
    return (
      <div>
	<main className="main">
	  <Route exact path='/' component={TracksPage} />
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
