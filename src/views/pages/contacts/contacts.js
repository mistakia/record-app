import React from 'react'
import { Link } from 'react-router-dom'

import Contactlist from '@components/contactlist'
import PageLayout from '@layouts/page'

export default function () {
  const { logId } = this.props.match.params
  const head = (
    <div>
      <h1>Contacts</h1>
      {logId === 'me' && <Link className='button' to='/contacts/new'>Add Contact</Link>}
    </div>
  )

  const body = (
    <Contactlist />
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
