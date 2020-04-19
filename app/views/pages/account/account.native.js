import React from 'react'
import {
  Text,
  View
} from 'react-native'

import PageLayout from '@layouts/page'
import CopyText from '@components/copy-text'
import ItemStyles from '@styles/item'
import TextStyles from '@styles/text'

export default function () {
  const { app } = this.props

  const body = (
    <View style={{margin: 20}}>
      <Text style={ItemStyles.label}>State</Text>
      <Text style={ItemStyles.label}>Address</Text>
      <CopyText style={ItemStyles.container} text={app.orbitdb.address}>
        <Text style={TextStyles.small}>{app.orbitdb.address}</Text>
      </CopyText>
      <Text style={ItemStyles.label}>Public Key</Text>
      <CopyText style={ItemStyles.container} text={app.orbitdb.publickey}>
        <Text style={TextStyles.small}>{app.orbitdb.publicKey}</Text>
      </CopyText>
      <Text style={ItemStyles.label}>PeerID</Text>
      <CopyText style={ItemStyles.container} text={app.ipfs.id}>
        <Text style={TextStyles.small}>{app.ipfs.id}</Text>
      </CopyText>
    </View>
  )

  return (
    <PageLayout title='Account' body={body} />
  )
}
