import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getContextMenuInfo, contextMenuActions } from '@core/context-menu'
import ContextMenu from './context-menu'

const mapStateToProps = createSelector(
  getContextMenuInfo,
  (contextMenuInfo) => ({ contextMenuInfo })
)

const mapDispatchToProps = {
  hide: contextMenuActions.hide
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContextMenu)
