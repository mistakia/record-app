import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import {
  getNotification,
  notificationActions
} from '@core/notifications'

import Notification from './notification'

const mapStateToProps = createSelector(
  getNotification,
  (notification) => ({ notification })
)

const mapDispatchToProps = dispatch => ({
  dismiss: (id) => dispatch(notificationActions.dismiss(id)),
  dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Notification)
