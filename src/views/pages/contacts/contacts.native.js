import React from 'react'
import { Text, View } from 'react-native'
import { Link } from 'react-router-native'

import Contactlist from '@components/contactlist'
import PageLayout from '@layouts/page'
import headStyles from '@styles/head'

export default function () {
  const { logId } = this.props.match.params
  const head = (
    <View style={headStyles.content}>
      <Text>Contacts</Text>
      {(logId === 'me' &&
        <Link style={headStyles.button} to='/contacts/new'>
          <Text>Add Contact</Text>
        </Link>)}
    </View>
  )

  const body = (
    <View style={{margin: 5}}>
      <Contactlist />
    </View>
  )

  return (
    <PageLayout head={head} body={body} />
  )
}
