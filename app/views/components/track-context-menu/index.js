import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getPlayerQueue, playerActions } from '@core/player'
import { getContextMenuTrack, contextMenuActions } from '@core/context-menu'
import TrackContextMenu from './track-context-menu'

const mapStateToProps = createSelector(
  getPlayerQueue,
  getContextMenuTrack,
  (queue, track) => ({ queue, track })
)

const mapDispatchToProps = {
  queueTrack: playerActions.queueTrack,
  unqueueTrack: playerActions.unqueueTrack,
  hide: contextMenuActions.hide
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TrackContextMenu)
