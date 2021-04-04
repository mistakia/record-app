import React from 'react'

import Button from '@material-ui/core/Button'
import MuiDialog from '@material-ui/core/Dialog'
import MuiDialogActions from '@material-ui/core/DialogActions'
import MuiDialogContent from '@material-ui/core/DialogContent'
import MuiDialogContentText from '@material-ui/core/DialogContentText'
import MuiDialogTitle from '@material-ui/core/DialogTitle'

export default class Dialog extends React.Component {
  handleClose = () => {
    this.props.close()
  }

  handleConfirm = () => {
    this.props.dialog.onConfirm()
    this.props.close()
  }

  render () {
    const { message, detail } = this.props.dialog

    return (
      <MuiDialog
        open={!!message}
        onClose={this.handleClose}
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'
      >
        <MuiDialogTitle id='alert-dialog-title'>{message}</MuiDialogTitle>
        {!!detail && <MuiDialogContent>
          <MuiDialogContentText id='alert-dialog-description'>
            {detail}
          </MuiDialogContentText>
        </MuiDialogContent>}
        <MuiDialogActions>
          <Button onClick={this.handleClose} size='small'>
            Cancel
          </Button>
          <Button onClick={this.handleConfirm} size='small'>
            Ok
          </Button>
        </MuiDialogActions>
      </MuiDialog>
    )
  }
}
