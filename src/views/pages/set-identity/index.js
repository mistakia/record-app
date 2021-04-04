import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp, appActions } from '@core/app'

import SetIdentityPage from './set-identity'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ app })
)

const mapDispatchToProps = {
  setIdentity: appActions.setIdentity
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SetIdentityPage)
