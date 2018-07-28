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
import CopyText from '@components/copy-text'
import ItemStyles from '@styles/item'
import TextStyles from '@styles/text'

export class InfoPage extends React.Component {
  componentWillMount () {
    this.props.init()
  }

  render () {
    const { info } = this.props

    const head = (
      <Text>Info</Text>
    )

    const subs = Object.keys(info.subs).map((id, index) => {
      const subPeers = info.subs[id]
      return (
        <View key={index} style={styles.row}>
          <View style={styles.cell}><Text>{subPeers.length}</Text></View>
          <View style={[styles.cell, {flex: 5}]}><Text style={TextStyles.small}>{id}</Text></View>
        </View>
      )
    })

    const peers = info.peers.map((peer, index) => {
      return (
        <View key={index} style={styles.row}>
          <View style={styles.cell}><Text>{index + 1}</Text></View>
          <View style={[styles.cell, {flex: 5}]}><Text style={TextStyles.small}>{peer.address}</Text></View>
        </View>
      )
    })

    const body = (
      <View style={{margin: 5}}>
        <Text style={ItemStyles.label}>State</Text>
        <View style={ItemStyles.container}>
          <Text style={TextStyles.small}>{info.state}</Text>
        </View>
        <Text style={ItemStyles.label}>Orbit DB Address</Text>
        <CopyText style={ItemStyles.container} text={info.orbitdb.address}>
          <Text style={TextStyles.small}>{info.orbitdb.address}</Text>
        </CopyText>
        <Text style={ItemStyles.label}>Orbit DB Public Key</Text>
        <CopyText style={ItemStyles.container} text={info.orbitdb.publickey}>
          <Text style={TextStyles.small}>{info.orbitdb.publicKey}</Text>
        </CopyText>
        <Text style={ItemStyles.label}>IPFS ID</Text>
        <CopyText style={ItemStyles.container} text={info.ipfs.id}>
          <Text style={TextStyles.small}>{info.ipfs.id}</Text>
        </CopyText>
        <Text style={ItemStyles.label}>IPFS Public Key</Text>
        <CopyText style={ItemStyles.container} text={info.ipfs.publicKey}>
          <Text style={TextStyles.small}>{info.ipfs.publicKey}</Text>
        </CopyText>
        <Text style={ItemStyles.label}>IPFS Agent Version</Text>
        <View style={ItemStyles.container}>
          <Text style={TextStyles.small}>{info.ipfs.agentVersion}</Text>
        </View>
        <Text style={ItemStyles.label}>IPFS Protocol Version</Text>
        <View style={ItemStyles.container}>
          <Text style={TextStyles.small}>{info.ipfs.protocolVersion}</Text>
        </View>
        <Text style={ItemStyles.label}>Subs</Text>
        <View style={styles.table}>{subs}</View>
        <Text style={ItemStyles.label}>Peers</Text>
        <View style={styles.table}>{peers}</View>
      </View>
    )

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const styles = StyleSheet.create({
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
)(InfoPage)
