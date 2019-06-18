import React from 'react'
import { Route, Redirect, Switch } from 'react-router'

import ContactsPage from '@pages/contacts'
import ExplorePage from '@pages/explore'
import FeedPage from '@pages/feed'
import EditAboutPage from '@pages/edit-about'
import InfoPage from '@pages/info'
import NewContactPage from '@pages/new-contact'
import NewTrackPage from '@pages/new-track'
import TracksPage from '@pages/tracks'

const Routes = () => (
  <Switch>
    <Route exact path='/new-contact:logId([0-9a-zA-Z\/]*)' component={NewContactPage} />
    <Route path='/contacts:logId([0-9a-zA-Z\/]*)' component={ContactsPage} />
    <Route exact path='/edit-about' component={EditAboutPage} />
    <Route exact path='/feed' component={FeedPage} />
    <Route exact path='/explore' component={ExplorePage} />
    <Route exact path='/info' component={InfoPage} />
    <Route exact path='/new-track' component={NewTrackPage} />
    <Route path='/tracks:logId([0-9a-zA-Z\/]*)' component={TracksPage} />
    <Route exact path='/' component={() => <Redirect to='/info' />} />
  </Switch>
)

export default Routes
