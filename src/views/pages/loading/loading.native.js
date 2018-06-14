import React from 'react'
import { Text } from 'react-native'

import PageLayout from '@layouts/page'

export class LoadingPage extends React.Component {
  render () {
    const head = (
      <Text>Loading</Text>
    )

    return (
      <PageLayout head={head} />
    )
  }
}

export default LoadingPage
