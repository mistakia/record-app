import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getCurrentTracklist, getTracksForCurrentTracklist } from '@core/tracklists'

import Tracklist from './tracklist'

const mapStateToProps = createSelector(
  getCurrentTracklist,
  getTracksForCurrentTracklist,
  (tracklist, tracks) => ({
    displayLoadingIndicator: tracklist.isPending,
    tracks
  })
)

export default connect(mapStateToProps, null)(Tracklist)
