import React from 'react'
import { View, Text } from 'react-native'

import Feedlist from '@components/feedlist'
import PageLayout from '@layouts/page'
import headStyles from '@styles/head'

export default function () {
  const head = (
    <View style={headStyles.content}>
      <Text>Feed</Text>
    </View>
  )

  const body = (
    <Feedlist />
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
