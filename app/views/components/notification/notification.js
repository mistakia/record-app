import React from 'react'
import Snackbar from '@material-ui/core/Snackbar'
import MuiAlert from '@material-ui/lab/Alert'

import Button from '@components/button'

import './notification.styl'

function Alert (props) {
  return <MuiAlert elevation={6} variant='filled' {...props} />
}

class Notification extends React.Component {
  constructor (props) {
    super(props)

    const { key } = props.notification
    this.state = {
      open: !!key,
      notification: key ? props.notification.toJS() : undefined,
      list: []
    }
  }

  handleExited = () => {
    this.setState({ notification: undefined })
  }

  handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }

    this.setState({ open: false })
  }

  handleClick = () => {
    this.props.dispatch(this.state.notification.action.onclick())
    this.setState({ open: false })
  }

  handleDismiss = () => {
    this.setState({ open: false })
  }

  componentDidUpdate (prevProps) {
    const nextNotification = this.state.list[0] || this.state.notification || {}
    if (prevProps.notification.key !== this.props.notification.key && nextNotification.text !== this.props.notification.text) {
      this.setState({ list: [...this.state.list, this.props.notification.toJS()] })
    }

    if (this.state.list.length && !this.state.notification) {
      this.setState({ notification: this.state.list[0], list: this.state.list.slice(1), open: true })
    } else if (this.state.list.length && this.state.notification && this.state.open) {
      this.setState({ open: false })
    }
  }

  render () {
    const { notification } = this.state

    if (!notification) return null

    let action
    if (notification.action) {
      action = (
        <React.Fragment>
          <Button isText onClick={this.handleClick}>
            {notification.action.text}
          </Button>
          <Button isText onClick={this.handleDismiss}>
            DISMISS
          </Button>
        </React.Fragment>
      )
    } else if (!notification.dismiss) {
      action = (
        <React.Fragment>
          <Button isText onClick={this.handleDismiss}>
            DISMISS
          </Button>
        </React.Fragment>
      )
    }

    return (
      <Snackbar
        key={notification.key}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
        open={this.state.open}
        autoHideDuration={notification.dismiss ? notification.dismiss : null}
        onClose={this.handleClose}
        onExited={this.handleExited}
        message={!notification.severity ? notification.text : undefined}
        action={action}
      >
        {notification.severity &&
          <Alert severity={notification.severity} action={action}>
            {notification.text}
          </Alert>}
      </Snackbar>
    )
  }
}

export default Notification
