import React from 'react'
import { View } from 'react-native'

import Heading from '@components/heading'
import PageLayout from '@layouts/page'
import Contactlist from '@components/contactlist'

export default function () {
  const {
    peerContactlist,
    allContactlist,
    peerContacts,
    allContacts
  } = this.props

  const body = (
    <View>
      <Heading title='Live' />
      <Contactlist
        contacts={peerContacts}
        displayLoadingIndicator={peerContactlist.isPending} />
      <Heading title='All' />
      <Contactlist
        contacts={allContacts}
        displayLoadingIndicator={allContactlist.isPending} />
    </View>
  )

  return (
    <PageLayout title='Explore' body={body} />
  )
}
