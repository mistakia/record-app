import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { taglistActions, getTagsForUser } from '@core/taglists'
import { getContextMenuTrack } from '@core/context-menu'
import { getApp } from '@core/app'

import TagContextMenu from './tag-context-menu'

const mapStateToProps = createSelector(
  getTagsForUser,
  getContextMenuTrack,
  getApp,
  (tags, track, app) => ({ tags, track, app })
)

const mapDispatchToProps = {
  addTag: taglistActions.addTag
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TagContextMenu)
