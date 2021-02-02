import React from 'react'
import hashicon from 'hashicon'
import { Link } from 'react-router-dom'

import PageLayout from '@layouts/page'
import Button from '@components/button'
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
              : <button onClick={showPrivateKey}>Reveal Secret Key</button>
            }
          </small>
        </CopyText>
        <div className='account__actions'>
          <Link className='button' to='/set-identity'>Load Existing Account</Link>
          <Button onClick={generateIdentity} isLoading={app.isPending}>Generate new Account</Button>
        </div>
      </div>
    </div>
  )

  return (
    <PageLayout body={body} scroll />
  )
}
