import React from 'react'

const { dialog } = require('electron').remote

export default async function Confirm ({
  title,
  message,
  detail,
  onConfirm
}) {
  const { response, checkboxChecked } = await dialog.showMessageBox({
    type: 'warning',
    message,
    title,
    detail,
    buttons: ['Cancel', 'Ok'],
    cancelId: 0
  })

  if (checkboxChecked) {
    // TODO cache ignore warning
  }

  if (response === 1 && onConfirm) {
    onConfirm()
  }
}
