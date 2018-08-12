import React from 'react'
import { Route, Switch } from 'react-router'

import ContactsPage from '@pages/contacts'
import FeedPage from '@pages/feed'
import InfoPage from '@pages/info'
import LoadingPage from '@pages/loading'
import NewContactPage from '@pages/new-contact'
import NewTrackPage from '@pages/new-track'
import TracksPage from '@pages/tracks'

const Routes = () => (
  <Switch>
    <Route exact path='/' component={LoadingPage} />
    <Route exact path='/contacts/new' component={NewContactPage} />
    <Route path='/contacts/:logId([0-9a-zA-Z\/]*)' component={ContactsPage} />
    <Route exact path='/feed' component={FeedPage} />
    <Route exact path='/info' component={InfoPage} />
    <Route exact path='/tracks/new' component={NewTrackPage} />
    <Route path='/tracks/:logId([0-9a-zA-Z\/]*)' component={TracksPage} />
  </Switch>
)

export default Routes
