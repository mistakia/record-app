import React from 'react'
import {
  Text,
  TextInput,
  View
} from 'react-native'
import queryString from 'query-string'

import PageLayout from '@layouts/page'
import formStyles from '@styles/form'

export default class LinkLogPage extends React.Component {
  constructor (props) {
    super(props)

    const { address } = this.props.match.params
    const { alias } = queryString.parse(this.props.location.search)

    this.state = {
      alias: alias || '',
      linkAddress: address || ''
    }

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit () {
    // TODO: validation
    const { alias, linkAddress } = this.state
    const { app } = this.props

    if (linkAddress && alias) {
      this.props.linkLog(app.address, { alias, linkAddress })
    }
  }

  render () {
    const body = (
      <View style={{margin: 20}}>
        <Text style={formStyles.label}>Alias</Text>
        <TextInput
          style={formStyles.input}
          placeholder='Log Nickname'
          onChangeText={(alias) => this.setState({alias})} value={this.state.alias} />
        <Text style={formStyles.label}>Address</Text>
        <TextInput
          style={formStyles.input}
          placeholder='/orbitdb/Qm.../record'
          onChangeText={(linkAddress) => this.setState({linkAddress})}
          value={this.state.linkAddress}
        />
        {/* <Button
            onClick={this.handleSubmit}>
            <Text>Submit</Text>
            </Button> */}
      </View>
    )

    return (
      <PageLayout title='Add Log' body={body} />
    )
  }
}
