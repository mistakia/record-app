import React from 'react'
import { Route, Redirect, Switch } from 'react-router'

import ContactsPage from '@pages/contacts'
import ExplorePage from '@pages/explore'
import EditAboutPage from '@pages/edit-about'
import SettingsPage from '@pages/settings'
import NewContactPage from '@pages/new-contact'
import NewTrackPage from '@pages/new-track'
import TracksPage from '@pages/tracks'
import SetIdentityPage from '@pages/set-identity'
import AccountPage from '@pages/account'

const logIdRe = '[0-9a-zA-Z\/-]*'

const Routes = () => (
  <Switch>
    <Route exact path={`/new-contact:logId(${logIdRe})`} component={NewContactPage} />
    <Route path={`/contacts:logId(${logIdRe})`} component={ContactsPage} />
    <Route exact path='/account' component={AccountPage} />
    <Route exact path='/edit-about' component={EditAboutPage} />
    <Route exact path='/explore' component={ExplorePage} />
    <Route exact path='/settings' component={SettingsPage} />
    <Route exact path='/new-track' component={NewTrackPage} />
    <Route exact path='/set-identity' component={SetIdentityPage} />
    <Route path={`/tracks:logId(${logIdRe})`} component={TracksPage} />
    <Route exact path='/' component={() => <Redirect to='/explore' />} />
  </Switch>
)

export default Routes
