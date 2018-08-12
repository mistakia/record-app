import React from 'react'
import { Text } from 'react-native'

import PageLayout from '@layouts/page'

export default function () {
  const head = (
    <Text>Loading</Text>
  )

  return (
    <PageLayout head={head} />
  )
}
