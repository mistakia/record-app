import React from 'react'
import { View } from 'react-native'

import Heading from '@components/heading'
import PageLayout from '@layouts/page'
import Contactlist from '@components/contactlist'

export default function () {
  const {
    peerContactlist,
    suggestedContactlist,
    peerContacts,
    suggestedContacts
  } = this.props

  const body = (
    <View>
      <Heading title='Live' />
      <Contactlist
        contacts={peerContacts}
        displayLoadingIndicator={peerContactlist.isPending} />
      <Heading title='Suggested' />
      <Contactlist
        contacts={suggestedContacts}
        displayLoadingIndicator={suggestedContactlist.isPending} />
    </View>
  )

  return (
    <PageLayout title='Explore' body={body} />
  )
}
