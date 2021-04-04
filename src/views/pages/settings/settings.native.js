import React from 'react'
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

import PageLayout from '@layouts/page'
import ItemStyles from '@styles/item'
import TextStyles from '@styles/text'

export default function () {
  const { info } = this.props

  const body = (
    <View style={{margin: 20}}>
      <Text style={ItemStyles.label}>State</Text>
      <View style={ItemStyles.container}>
        <Text style={TextStyles.small}>{info.state}</Text>
      </View>
      <View style={styles.table}>
        <View style={styles.row}>
          <View style={styles.cell}><Text style={ItemStyles.label}>IPFS Agent Version</Text></View>
          <View style={styles.cell}><Text style={TextStyles.small}>{info.ipfs.agentVersion}</Text></View>
        </View>
        <View style={styles.row}>
          <View style={styles.cell}><Text style={ItemStyles.label}>IPFS Protocol Version</Text></View>
          <View style={styles.cell}><Text style={TextStyles.small}>{info.ipfs.protocolVersion}</Text></View>
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
    </View>
  )

  return (
    <PageLayout title='Settings' body={body} />
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
