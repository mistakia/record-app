import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp, appActions } from '@core/app'

import render from './account'

class AccountPage extends React.Component {
  render () {
    return render.call(this)
  }
}

const mapStateToProps = createSelector(
  getApp,
  (app) => ({app})
)

const mapDispatchToProps = {
  getPrivateKey: appActions.getPrivateKey,
  setIdentity: appActions.setIdentity
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AccountPage)
