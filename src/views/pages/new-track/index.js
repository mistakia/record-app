import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { tracklistActions, getCurrentTracklistIsUpdating } from '@core/tracklists'

import NewTrackPage from './new-track'

const mapStateToProps = createSelector(
  getApp,
  getCurrentTracklistIsUpdating,
  (app, isUpdating) => ({ app, isUpdating })
)

const mapDispatchToProps = {
  addTrack: tracklistActions.addTrack
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewTrackPage)
