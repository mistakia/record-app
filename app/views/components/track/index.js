import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { tracklistActions } from '@core/tracklists'
import { getApp } from '@core/app'
import Track from './track'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ app })
)

const mapDispatchToProps = {
  add: tracklistActions.addTrack,
  remove: tracklistActions.removeTrack
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Track)
