import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getPlayerQueue, playerActions } from '@core/player'
import { getContextMenuInfo, contextMenuActions } from '@core/context-menu'
import TrackContextMenu from './track-context-menu'

const mapStateToProps = createSelector(
  getPlayerQueue,
  getContextMenuInfo,
  (queue, contextMenuInfo) => ({ queue, contextMenuInfo })
)

const mapDispatchToProps = {
  queueTrack: playerActions.queueTrack,
  unqueueTrack: playerActions.unqueueTrack,
  showContext: contextMenuActions.show,
  hide: contextMenuActions.hide
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TrackContextMenu)
