import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { tracklistActions, getCurrentTracklist } from '@core/tracklists'

import TracklistFilter from './tracklist-filter'

const mapStateToProps = createSelector(
  getCurrentTracklist,
  (tracklist) => ({
    sort: tracklist.sort,
    order: tracklist.order
  })
)

const mapDispatchToProps = {
  reorder: tracklistActions.reorderTracklist
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TracklistFilter)
