import React from 'react'
import { Route, Redirect, Switch } from 'react-router'

import EditAboutPage from '@pages/edit-about'
import SettingsPage from '@pages/settings'
import LinkLogPage from '@pages/link-log'
import ImporterPage from '@pages/importer'
import TracksPage from '@pages/tracks'
import SingleLogsPage from '@pages/single-logs'
import SingleTracksPage from '@pages/single-tracks'
import SetIdentityPage from '@pages/set-identity'
import AccountPage from '@pages/account'
import ListensPage from '@pages/listens'

const addressRe = '[0-9a-zA-Z/-]*'

const Routes = () => (
  <Switch>
    <Route exact path={`/link-log:address(${addressRe})`} component={LinkLogPage} />
    <Route path={`/logs:address(${addressRe})`} component={SingleLogsPage} />
    <Route exact path='/account' component={AccountPage} />
    <Route exact path='/listens' component={ListensPage} />
    <Route exact path='/edit-about' component={EditAboutPage} />
    <Route exact path='/tracks' component={TracksPage} />
    <Route exact path='/settings' component={SettingsPage} />
    <Route exact path='/importer' component={ImporterPage} />
    <Route exact path='/set-identity' component={SetIdentityPage} />
    <Route path={`/tracks:address(${addressRe})`} component={SingleTracksPage} />
    <Route exact path='/' component={() => <Redirect to='/tracks' />} />
  </Switch>
)

export default Routes
