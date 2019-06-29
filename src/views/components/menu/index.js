import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { withRouter } from 'react-router'

import { getApp } from '@core/app'

import Menu from './menu'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({app})
)

export default withRouter(connect(
  mapStateToProps
)(Menu))
