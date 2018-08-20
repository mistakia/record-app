import React from 'react'
import { View, Text } from 'react-native'
import { Link } from 'react-router-native'

import Taglist from '@components/taglist'
import Tracklist from '@components/tracklist'
import PageLayout from '@layouts/page'
import Profile from '@components/profile'

export default function () {
  const head = (
    <Profile />
  )

  const body = (
    <View>
      <Taglist />
      <Tracklist />
    </View>
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
