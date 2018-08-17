import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentTaglist,
  getCurrentSelectedTags,
  getTagsForCurrentTaglist
} from '@core/taglists'
import { tracklistActions } from '@core/tracklists'

import Taglist from './taglist'

const mapStateToProps = createSelector(
  getCurrentTaglist,
  getCurrentSelectedTags,
  getTagsForCurrentTaglist,
  (taglist, selectedTags, tags) => ({
    displayLoadingIndicator: taglist.isPending,
    selectedTags,
    tags
  })
)

const mapDispatchToProps = {
  toggleTag: tracklistActions.toggleTag
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Taglist)
