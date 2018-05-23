import React, { Component } from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'
import {
  StyleSheet,
  Text,
  View
} from 'react-native'

import PageLayout from '@layouts/page'
import { getInfo } from '@core/info'

export class HomePage extends Component {
  render () {
    const { info } = this.props

    const head = (
      <Text>Home</Text>
    )

    const body = (
      <View style={{
              margin: 5
            }}>
        <Text style={styles.label}>Orbit DB Address</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.orbitdb.address}</Text>
        </View>
        <Text style={styles.label}>Orbit DB Public Key</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.orbitdb.publicKey}</Text>
        </View>
        <Text style={styles.label}>IPFS ID</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.ipfs.id}</Text>
        </View>
        <Text style={styles.label}>IPFS Public Key</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.ipfs.publicKey}</Text>
        </View>
        <Text style={styles.label}>IPFS Agent Version</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.ipfs.agentVersion}</Text>
        </View>
        <Text style={styles.label}>IPFS Protocol Version</Text>
        <View style={styles.container}>
          <Text style={styles.pre}>{info.ipfs.protocolVersion}</Text>
        </View>
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

export default connect(
  mapStateToProps
)(HomePage)
