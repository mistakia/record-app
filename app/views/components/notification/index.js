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
  dismiss: () => dispatch(notificationActions.dismiss()),
  dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Notification)
