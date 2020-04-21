import React from 'react'
import { View } from 'react-native'

import Heading from '@components/heading'
import PageLayout from '@layouts/page'
import Loglist from '@components/loglist'

export default function () {
  const {
    peerLoglist,
    allLoglist,
    peerLogs,
    allLogs
  } = this.props

  const body = (
    <View>
      <Heading title='Live' />
      <Loglist
        logs={peerLogs}
        displayLoadingIndicator={peerLoglist.isPending} />
      <Heading title='All' />
      <Loglist
        logs={allLogs}
        displayLoadingIndicator={allLoglist.isPending} />
    </View>
  )

  return (
    <PageLayout title='Home' body={body} />
  )
}
