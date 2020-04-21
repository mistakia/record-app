import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { aboutActions, getAboutIsUpdating } from '@core/about'
import { logActions, getMyLog } from '@core/logs'

import EditAboutPage from './edit-about'

const mapStateToProps = createSelector(
  getMyLog,
  getApp,
  getAboutIsUpdating,
  (log, app, isUpdating) => ({ log, app, isUpdating })
)

const mapDispatchToProps = {
  loadLog: logActions.loadLog,
  setAbout: aboutActions.setAbout
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditAboutPage)
