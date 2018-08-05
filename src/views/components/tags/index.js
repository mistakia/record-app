import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { taglistActions, getTagsForUserTaglist } from '@core/taglists'
import Tags from './tags'

const mapStateToProps = createSelector(
  getTagsForUserTaglist,
  (tags) => ({ tags })
)

const mapDispatchToProps = {
  addTag: taglistActions.addTag,
  removeTag: taglistActions.removeTag
}

export default connect(mapStateToProps, mapDispatchToProps)(Tags)
