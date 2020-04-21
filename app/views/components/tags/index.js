import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { contextMenuActions } from '@core/context-menu'
import { getCurrentTracklistAddress, tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { getApp } from '@core/app'
import Tags from './tags'

const mapStateToProps = createSelector(
  getApp,
  getCurrentTracklistAddress,
  (app, currentTracklistAddress) => ({ app, currentTracklistAddress })
)

const mapDispatchToProps = {
  toggleTag: tracklistActions.toggleTag,
  removeTag: taglistActions.removeTag,
  showContext: contextMenuActions.show
}

export default connect(mapStateToProps, mapDispatchToProps)(Tags)
