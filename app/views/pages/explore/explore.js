import React from 'react'

import Contactlist from '@components/contactlist'
import PageLayout from '@layouts/page'

export default function () {
  const { contacts, allContactlist } = this.props

  const body = (
    <Contactlist
      showAdd
      contacts={contacts}
      displayLoadingIndicator={allContactlist.isPending} />
  )

  return (
    <PageLayout title='Explore' body={body} />
  )
}
