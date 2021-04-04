import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getApp } from '@core/app'
import { tracklistActions } from '@core/tracklists'
import { contextMenuActions } from '@core/context-menu'

import UrlContextMenu from './url-context-menu'

const mapStateToProps = createSelector(
  getApp,
  (app) => ({ app })
)

const mapDispatchToProps = {
  addTrack: tracklistActions.addTrack,
  hide: contextMenuActions.hide
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(UrlContextMenu)
