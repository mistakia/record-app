import React from 'react'
import { Text, View } from 'react-native'
import { Link } from 'react-router-native'

import Contactlist from '@components/contactlist'
import PageLayout from '@layouts/page'
import Profile from '@components/profile'
import Button from '@components/button'

export default function () {
  const { logId } = this.props.match.params
  const head = (
    <Profile />
  )

  const body = (
    <View style={{margin: 5}}>
      { logId === 'me' &&
        <Link component={Button} to='/contacts/new/'>
          <Text>Add Contact</Text>
        </Link> }
      <Contactlist />
    </View>
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
