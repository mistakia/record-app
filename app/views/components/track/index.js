import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { tracklistActions } from '@core/tracklists'
import { contextMenuActions, getContextMenuInfo } from '@core/context-menu'
import { getApp } from '@core/app'
import Track from './track'

const mapStateToProps = createSelector(
  getApp,
  getContextMenuInfo,
  (app, contextMenuInfo) => ({ app, contextMenuTrackId: contextMenuInfo.trackId })
)

const mapDispatchToProps = {
  add: tracklistActions.addTrack,
  remove: tracklistActions.removeTrack,
  showContext: contextMenuActions.show
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Track)
