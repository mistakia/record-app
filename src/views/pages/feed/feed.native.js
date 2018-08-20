import React from 'react'
import { View, Text } from 'react-native'

import Feedlist from '@components/feedlist'
import PageLayout from '@layouts/page'

export default function () {
  const head = (
    <Text>Feed</Text>
  )

  const body = (
    <Feedlist />
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
