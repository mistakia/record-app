import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { taglistActions, getTagsForUser } from '@core/taglists'
import { getApp } from '@core/app'
import Tags from './tags'

const mapStateToProps = createSelector(
  getTagsForUser,
  getApp,
  (tags, app) => ({ tags, app })
)

const mapDispatchToProps = {
  addTag: taglistActions.addTag,
  removeTag: taglistActions.removeTag
}

export default connect(mapStateToProps, mapDispatchToProps)(Tags)
