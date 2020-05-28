import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { withRouter } from 'react-router'

import { getApp } from '@core/app'
import { getMyLog, getAllLogs } from '@core/logs'

import Menu from './menu'

const mapStateToProps = createSelector(
  getApp,
  getMyLog,
  getAllLogs,
  (app, log, logs) => ({app, log, logs})
)

export default withRouter(connect(
  mapStateToProps
)(Menu))
