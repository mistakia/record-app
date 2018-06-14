import React from 'react'
import { Route, Switch } from 'react-router'

import LoadingPage from '@pages/loading'
import InfoPage from '@pages/info'
import TracksPage from '@pages/tracks'
import ContactsPage from '@pages/contacts'
import NewContactPage from '@pages/new-contact'
import NewTrackPage from '@pages/new-track'

const Routes = () => (
  <Switch>
    <Route exact path='/' component={LoadingPage} />
    <Route exact path='/info' component={InfoPage} />
    <Route exact path='/tracks/new' component={NewTrackPage} />
    <Route path='/tracks/:logId([0-9a-zA-Z\/]*)' component={TracksPage} />
    <Route exact path='/contacts/new' component={NewContactPage} />
    <Route path='/contacts/:logId([0-9a-zA-Z\/]*)' component={ContactsPage} />
  </Switch>
)

export default Routes
