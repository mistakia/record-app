import React from 'react'
import { connect } from 'react-redux'

import Menu from '@components/Menu'
import { infoActions } from '@core/info'
import Routes from '@views/routes'

import 'normalize.css'
import '@styles/normalize.css'
import '@styles/index.styl'
import './App.styl'

export class App extends React.Component {
  componentWillMount () {
    this.props.init()
  }

  render () {
    return (
      <div>
        <main className='main scroll'>
          <Menu />
          <Routes />
        </main>
      </div>
    )
  }
}

const mapDispatchToProps = {
  init: infoActions.init
}

export default connect(
  null,
  mapDispatchToProps
)(App)
