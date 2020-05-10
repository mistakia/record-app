import { connect } from 'react-redux'

import { tracklistActions } from '@core/tracklists'
import { contextMenuActions } from '@core/context-menu'

import UrlContextMenu from './url-context-menu'

const mapDispatchToProps = {
  addTrack: tracklistActions.addTrack,
  hide: contextMenuActions.hide
}

export default connect(
  null,
  mapDispatchToProps
)(UrlContextMenu)
