import React from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

import PageLayout from '@layouts/page'
import { getInfo, infoActions } from '@core/info'
import CopyText from '@components/CopyText'

export class HomePage extends React.Component {
  componentWillMount () {
    this.props.init()
  }

  render () {
    const { info } = this.props

    const head = (
      <Text>Home</Text>
    )

    const subs = Object.keys(info.subs).map((id, index) => {
      const subPeers = info.subs[id]
      return (
        <View key={index} style={styles.row}>
          <View style={styles.cell}><Text>{subPeers.length}</Text></View>
          <View style={[styles.cell, {flex: 5}]}><Text>{id}</Text></View>
        </View>
      )
    })

    const peers = info.peers.map((peer, index) => {
      return (
        <View key={index} style={styles.row}>
          <View style={styles.cell}><Text>{index + 1}</Text></View>
          <View style={[styles.cell, {flex: 5}]}><Text>{peer.address}</Text></View>
        </View>
      )
    })

    const body = (
      <View style={{margin: 5}}>
        <Text style={styles.label}>State</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.state}</Text>
        </View>
        <Text style={styles.label}>Orbit DB Address</Text>
        <CopyText style={styles.container} text={info.orbitdb.address}>
          <Text style={styles.pre}>{info.orbitdb.address}</Text>
        </CopyText>
        <Text style={styles.label}>Orbit DB Public Key</Text>
        <CopyText style={styles.container} text={info.orbitdb.publickey}>
          <Text style={styles.pre}>{info.orbitdb.publicKey}</Text>
        </CopyText>
        <Text style={styles.label}>IPFS ID</Text>
        <CopyText style={styles.container} text={info.ipfs.id}>
          <Text style={styles.pre}>{info.ipfs.id}</Text>
        </CopyText>
        <Text style={styles.label}>IPFS Public Key</Text>
        <CopyText style={styles.container} text={info.ipfs.publicKey}>
          <Text style={styles.pre}>{info.ipfs.publicKey}</Text>
        </CopyText>
        <Text style={styles.label}>IPFS Agent Version</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.ipfs.agentVersion}</Text>
        </View>
        <Text style={styles.label}>IPFS Protocol Version</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.ipfs.protocolVersion}</Text>
        </View>
        <Text style={styles.label}>Subs</Text>
        <View style={styles.table}>{subs}</View>
        <Text style={styles.label}>Peers</Text>
        <View style={styles.table}>{peers}</View>
      </View>
    )

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    padding: 5,
    backgroundColor: 'white'
  },
  pre: {
    padding: 5,
    fontSize: 12
  },
  table: {
    padding: 5,
    backgroundColor: 'white',
    marginBottom: 5
  },
  row: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white'
  },
  cell: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5
  },
  container: {
    backgroundColor: 'white',
    marginBottom: 5,
    padding: 5
  }
})

const mapStateToProps = createSelector(
  getInfo,
  (info) => ({info})
)

const mapDispatchToProps = {
  init: infoActions.init
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HomePage)
