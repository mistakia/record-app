import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { loglistActions } from '@core/loglists'
import { logActions } from '@core/logs'
import { dialogActions } from '@core/dialogs'
import {
  contextMenuActions,
  getContextMenuLog
} from '@core/context-menu'
import LogContextMenu from './log-context-menu'

const mapStateToProps = createSelector(
  getContextMenuLog,
  (log) => ({ log })
)

const mapDispatchToProps = {
  unlinkLog: loglistActions.unlinkLog,
  connect: logActions.connectLog,
  disconnect: logActions.disconnectLog,
  hide: contextMenuActions.hide,
  showDialog: dialogActions.show
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LogContextMenu)
