import React from 'react'
import hashicon from 'hashicon'
import { Link } from 'react-router-dom'
import Button from '@material-ui/core/Button'
import CircularProgress from '@material-ui/core/CircularProgress'

import PageLayout from '@layouts/page'
import CopyText from '@components/copy-text'

import './account.styl'

export default function () {
  const { app, getPrivateKey, setIdentity, showDialog } = this.props

  const showPrivateKey = (event) => {
    event && event.stopPropagation && event.stopPropagation()
    getPrivateKey()
  }

  const generateIdentity = (event) => {
    event && event.stopPropagation && event.stopPropagation()
    showDialog({
      message: 'Are you sure you want to generate a new account',
      detail: 'You will not be able to recover your current account if you do not have the secret key',
      onConfirm: () => setIdentity()
    })
  }

  const appIcon = app.id ? hashicon(app.id, 40) : null
  const addressIcon = app.address ? hashicon(app.address, 40) : null
  const keyIcon = app.privateKey ? hashicon(app.privateKey, 40) : null

  const body = (
    <div id='account-container'>
      <div>
        <CopyText text={app.id}>
          <label>Account ID</label>
          <img src={appIcon && appIcon.toDataURL()} />
          <small>{app.id}</small>
        </CopyText>
        <CopyText text={app.orbitdb.address}>
          <label>Library Address</label>
          <img src={addressIcon && addressIcon.toDataURL()} />
          <small>{app.orbitdb.address}</small>
        </CopyText>
        <CopyText text={app.privateKey} disabled={!app.privateKey}>
          <label>Account Secret Key</label>
          <img src={keyIcon && keyIcon.toDataURL()} />
          <small>
            { app.privateKey
              ? app.privateKey
              : <Button onClick={showPrivateKey}>Reveal Secret Key</Button>
            }
          </small>
        </CopyText>
        <div className='account__actions'>
          <Button component={Link} to='/set-identity' variant='outlined'>Load Existing Account</Button>
          <Button onClick={generateIdentity} variant='outlined'>
            {app.isPending ? <CircularProgress size={24} /> : 'Generate new Account'}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <PageLayout body={body} scroll />
  )
}
