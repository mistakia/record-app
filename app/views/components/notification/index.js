import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import {
  getNotificationItem,
  notificationActions
} from '@core/notifications'

import Notification from './notification'

const mapStateToProps = createSelector(
  getNotificationItem,
  (item) => ({
    item
  })
)

const mapDispatchToProps = dispatch => ({
  dismiss: (id) => dispatch(notificationActions.dismiss(id)),
  dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Notification)
