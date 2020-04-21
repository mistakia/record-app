import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { loglistActions, getMyLoglistIsUpdating } from '@core/loglists'

import LinkLogPage from './link-log'

const mapStateToProps = createSelector(
  getApp,
  getMyLoglistIsUpdating,
  (app, isUpdating) => ({ app, isUpdating })
)

const mapDispatchToProps = {
  linkLog: loglistActions.linkLog
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LinkLogPage)
