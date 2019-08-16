import React from 'react'

const { dialog } = window.require('electron').remote

export default function Confirm ({
  title,
  message,
  detail,
  onConfirm
}) {
  dialog.showMessageBox({
    type: 'warning',
    message,
    title,
    detail,
    buttons: ['Cancel', 'Ok'],
    cancelId: 0
  }, (response, checkBoxChecked) => {
    if (checkBoxChecked) {
      // TODO cache ignore warning
    }

    if (response === 1 && onConfirm) {
      onConfirm()
    }
  })
}
