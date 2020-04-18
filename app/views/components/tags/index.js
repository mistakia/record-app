import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { contextMenuActions } from '@core/context-menu'
import { getCurrentTracklistId, tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import Tags from './tags'

const mapStateToProps = createSelector(
  getApp,
  getCurrentTracklistId,
  (app, currentTracklistId) => ({ app, currentTracklistId })
)

const mapDispatchToProps = {
  toggleTag: tracklistActions.toggleTag,
  removeTag: taglistActions.removeTag,
  showContext: contextMenuActions.show
}

export default connect(mapStateToProps, mapDispatchToProps)(Tags)
