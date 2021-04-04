import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { loglistActions } from '@core/loglists'

import LinkLogPage from './link-log'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ app })
)

const mapDispatchToProps = {
  linkLog: loglistActions.linkLog
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LinkLogPage)
