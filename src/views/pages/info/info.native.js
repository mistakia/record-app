import React from 'react'
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

import PageLayout from '@layouts/page'
import CopyText from '@components/copy-text'
import ItemStyles from '@styles/item'
import TextStyles from '@styles/text'

export default function () {
  const { app, info } = this.props

  const peers = info.peers.map((peer, index) => {
    return (
      <View key={index} style={styles.row}>
        <View style={styles.cell}><Text>{index + 1}</Text></View>
        <View style={[styles.cell, {flex: 5}]}><Text style={TextStyles.small}>{peer.address}</Text></View>
      </View>
    )
  })

  const body = (
    <View style={{margin: 20}}>
      <Text style={ItemStyles.label}>State</Text>
      <View style={ItemStyles.container}>
        <Text style={TextStyles.small}>{info.state}</Text>
      </View>
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
      <View style={styles.table}>
        <View style={styles.row}>
          <View style={styles.cell}><Text style={ItemStyles.label}>IPFS Agent Version</Text></View>
          <View style={styles.cell}><Text style={TextStyles.small}>{app.ipfs.agentVersion}</Text></View>
        </View>
        <View style={styles.row}>
          <View style={styles.cell}><Text style={ItemStyles.label}>IPFS Protocol Version</Text></View>
          <View style={styles.cell}><Text style={TextStyles.small}>{app.ipfs.protocolVersion}</Text></View>
        </View>
        <View style={styles.row}>
          <View style={styles.cell}><Text style={ItemStyles.label}>Data Sent</Text></View>
          <View style={styles.cell}><Text style={TextStyles.small}>{info.bitswap.dataSent}</Text></View>
        </View>
        <View style={styles.row}>
          <View style={styles.cell}><Text style={ItemStyles.label}>Data Received</Text></View>
          <View style={styles.cell}><Text style={TextStyles.small}>{info.bitswap.dataReceived}</Text></View>
        </View>
        <View style={styles.row}>
          <View style={styles.cell}><Text style={ItemStyles.label}>Repo Objects</Text></View>
          <View style={styles.cell}><Text style={TextStyles.small}>{info.repo.numObjects}</Text></View>
        </View>
        <View style={styles.row}>
          <View style={styles.cell}><Text style={ItemStyles.label}>Repo Size</Text></View>
          <View style={styles.cell}><Text style={TextStyles.small}>{parseFloat(info.repo.repoSize).toFixed(2)} Mb</Text></View>
        </View>
      </View>
      <Text style={ItemStyles.label}>Peers</Text>
      <View style={styles.table}>{peers}</View>
    </View>
  )

  return (
    <PageLayout title='Info' body={body} />
  )
}

const styles = StyleSheet.create({
  table: {
    backgroundColor: 'white',
    marginBottom: 5
  },
  row: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fbfbfb',
    borderColor: '#f0f0f0',
    borderWidth: 1,
    marginTop: -1
  },
  cell: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5
  }
})
