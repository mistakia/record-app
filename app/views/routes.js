import React from 'react'
import { Route, Redirect, Switch } from 'react-router'

import LogsPage from '@pages/logs'
import ExplorePage from '@pages/explore'
import EditAboutPage from '@pages/edit-about'
import SettingsPage from '@pages/settings'
import LinkLogPage from '@pages/link-log'
import NewTrackPage from '@pages/new-track'
import TracksPage from '@pages/tracks'
import SetIdentityPage from '@pages/set-identity'
import AccountPage from '@pages/account'
import ListensPage from '@pages/listens'

const logAddressRe = '[0-9a-zA-Z\/-]*'

const Routes = () => (
  <Switch>
    <Route exact path={`/link-log:logAddress(${logAddressRe})`} component={LinkLogPage} />
    <Route path={`/logs:logAddress(${logAddressRe})`} component={LogsPage} />
    <Route exact path='/account' component={AccountPage} />
    <Route exact path='/listens' component={ListensPage} />
    <Route exact path='/edit-about' component={EditAboutPage} />
    <Route exact path='/explore' component={ExplorePage} />
    <Route exact path='/settings' component={SettingsPage} />
    <Route exact path='/new-track' component={NewTrackPage} />
    <Route exact path='/set-identity' component={SetIdentityPage} />
    <Route path={`/tracks:logAddress(${logAddressRe})`} component={TracksPage} />
    <Route exact path='/' component={() => <Redirect to='/explore' />} />
  </Switch>
)

export default Routes
