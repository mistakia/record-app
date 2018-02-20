import React from 'react'

import { Route } from 'react-router-dom'
import HomePage from '@pages/home'
import IdentityPage from '@pages/identity'

export default () => (
  <div>
    <h4>Hello World!</h4>

    <main className="main">
      <Route exact path='/' component={HomePage} />
      <Route path='/identities/:id/:resource' component={IdentityPage} />
    </main>
  </div>
)

