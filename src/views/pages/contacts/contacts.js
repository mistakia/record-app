import React from 'react'
import { Link } from 'react-router-dom'

import Contactlist from '@components/contactlist'
import PageLayout from '@layouts/page'
import Profile from '@components/profile'
import Button from '@components/button'

export default function () {
  const { logId } = this.props.match.params
  const head = (
    <Profile />
  )

  const body = (
    <div>
      { logId === 'me' &&
        <Link className='button' to='/contacts/new/'>
          Add Contact
        </Link> }
      <Contactlist />
    </div>
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
