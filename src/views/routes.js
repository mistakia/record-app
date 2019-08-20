import React from 'react'
import { Route, Redirect, Switch } from 'react-router'

import ContactsPage from '@pages/contacts'
import ExplorePage from '@pages/explore'
import EditAboutPage from '@pages/edit-about'
import InfoPage from '@pages/info'
import NewContactPage from '@pages/new-contact'
import NewTrackPage from '@pages/new-track'
import TracksPage from '@pages/tracks'
import SetIdentityPage from '@pages/set-identity'

const logIdRe = '[0-9a-zA-Z\/-]*'

const Routes = () => (
  <Switch>
    <Route exact path={`/new-contact:${logIdRe})`} component={NewContactPage} />
    <Route path={`/contacts:logId(${logIdRe})`} component={ContactsPage} />
    <Route exact path='/edit-about' component={EditAboutPage} />
    <Route exact path='/explore' component={ExplorePage} />
    <Route exact path='/info' component={InfoPage} />
    <Route exact path='/new-track' component={NewTrackPage} />
    <Route exact path='/set-identity' component={SetIdentityPage} />
    <Route path={`/tracks:logId(${logIdRe})`} component={TracksPage} />
    <Route exact path='/' component={() => <Redirect to='/info' />} />
  </Switch>
)

export default Routes
