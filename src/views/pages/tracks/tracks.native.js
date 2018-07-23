import React from 'react'
import { View, Text } from 'react-native'
import { Link } from 'react-router-native'

import Tracklist from '@components/Tracklist'
import PageLayout from '@layouts/page'
import headStyles from '@styles/head'

export default function () {
  const { logId } = this.props.match.params
  const head = (
    <View style={headStyles.content}>
      <Text>Tracks</Text>
      {logId === 'me' && <Link style={headStyles.button} to='/tracks/new'>
        <Text>Add Track</Text>
      </Link>}
    </View>
  )

  const body = (
    <Tracklist />
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
