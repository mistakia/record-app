import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { withRouter } from 'react-router'

import { getApp } from '@core/app'
import { getMyLog } from '@core/logs'

import Menu from './menu'

const mapStateToProps = createSelector(
  getApp,
  getMyLog,
  (app, log) => ({app, log})
)

export default withRouter(connect(
  mapStateToProps
)(Menu))
