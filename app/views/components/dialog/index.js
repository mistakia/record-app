import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { dialogActions, getDialog } from '@core/dialogs'

import Dialog from './dialog'

const mapStateToProps = createSelector(
  getDialog,
  (dialog) => ({ dialog })
)

const mapDispatchToProps = {
  close: dialogActions.close
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Dialog)
