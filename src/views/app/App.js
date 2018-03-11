import React from 'react'
import { Component } from 'react'

import { Route } from 'react-router-dom'
import HomePage from '@pages/home'

export default class App extends Component {
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
