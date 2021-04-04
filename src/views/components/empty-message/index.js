import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { logActions } from '@core/logs'

import EmptyMessage from './empty-message'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ address: app.address })
)

const mapDispatchToProps = {
  connect: logActions.connectLog,
  disconnect: logActions.disconnectLog
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EmptyMessage)
