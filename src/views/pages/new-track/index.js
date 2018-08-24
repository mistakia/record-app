import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { tracklistActions } from '@core/tracklists'
import { getApp } from '@core/app'

import NewTrackPage from './new-track'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({app})
)

const mapDispatchToProps = {
  addTrack: tracklistActions.addTrack
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewTrackPage)
