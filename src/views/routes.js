import React from 'react'
import { Route, Redirect, Switch } from 'react-router'

import ContactsPage from '@pages/contacts'
import FeedPage from '@pages/feed'
import EditProfilePage from '@pages/edit-profile'
import InfoPage from '@pages/info'
import NewContactPage from '@pages/new-contact'
import NewTrackPage from '@pages/new-track'
import TracksPage from '@pages/tracks'

const Routes = () => (
  <Switch>
    <Route exact path='/contacts/new/:logId([0-9a-zA-Z\/]*)' component={NewContactPage} />
    <Route path='/contacts/:logId([0-9a-zA-Z\/]*)' component={ContactsPage} />
    <Route exact path='/edit-profile' component={EditProfilePage} />
    <Route exact path='/feed' component={FeedPage} />
    <Route exact path='/info' component={InfoPage} />
    <Route exact path='/tracks/new' component={NewTrackPage} />
    <Route path='/tracks/:logId([0-9a-zA-Z\/]*)' component={TracksPage} />
    <Route exact path='/' component={() => <Redirect to='/info' />} />
  </Switch>
)

export default Routes
