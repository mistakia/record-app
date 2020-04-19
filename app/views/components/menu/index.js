import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { withRouter } from 'react-router'

import { getApp } from '@core/app'
import { getContactMe } from '@core/contacts'

import Menu from './menu'

const mapStateToProps = createSelector(
  getApp,
  getContactMe,
  (app, contact) => ({app, contact})
)

export default withRouter(connect(
  mapStateToProps
)(Menu))
