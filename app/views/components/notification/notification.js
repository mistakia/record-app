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

    this.dismiss()
  }

  dismiss = () => {
    if (this.state.notification.action) {
      this.props.dispatch(this.state.notification.action.onclick())
    }

    this.setState({ open: false })
  }

  componentDidUpdate (prevProps) {
    if (prevProps.notification.text !== this.props.notification.text) {
      this.setState({ list: [...this.state.list, this.props.notification.toJS()] })
    }

    if (this.state.list.length && !this.state.notification) {
      this.setState({ notification: this.state.list[0] })
      this.setState({ list: this.state.list.slice(1), open: true })
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
          <Button isText onClick={this.dismiss}>
            {notification.action.text}
          </Button>
        </React.Fragment>
      )
    } else if (!notification.dismiss) {
      action = (
        <React.Fragment>
          <Button isText onClick={this.dismiss}>
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
