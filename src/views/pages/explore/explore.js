import React from 'react'

import Contactlist from '@components/contactlist'
import Heading from '@components/heading'
import PageLayout from '@layouts/page'

export default function () {
  const {
    peerContactlist,
    allContactlist,
    peerContacts,
    allContacts
  } = this.props

  const body = (
    <div>
      <Heading title='Live' />
      <Contactlist
        contacts={peerContacts}
        displayLoadingIndicator={peerContactlist.isPending} />
      <Heading title='All' />
      <Contactlist
        contacts={allContacts}
        displayLoadingIndicator={allContactlist.isPending} />
    </div>
  )

  return (
    <PageLayout title='Explore' body={body} />
  )
}
