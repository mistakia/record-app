import React from 'react'
import { connect } from 'react-redux'
import {
  Text,
  TextInput,
  View
} from 'react-native'

import { parseQueryString } from '@core/utils'
import Button from '@components/button'
import PageLayout from '@layouts/page'
import formStyles from '@styles/form'

export default class NewContactPage extends React.Component {
  constructor (props) {
    super(props)

    const { logId } = this.props.match.params
    const { alias } = parseQueryString(this.props.location.search)

    this.state = {
      alias: alias || '',
      address: logId || ''
    }

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit () {
    // TODO: validation
    const { alias, address } = this.state
    const { app } = this.props

    if (address && alias) {
      this.props.addContact(app.address, { alias, address })
    }
  }

  render () {
    const head = (
      <Text>Add Contact</Text>
    )

    const body = (
      <View>
        <Text style={formStyles.label}>Alias</Text>
        <TextInput
          style={formStyles.input}
          placeholder='Contact Nickname'
          onChangeText={(alias) => this.setState({alias})} value={this.state.alias} />
        <Text style={formStyles.label}>Address</Text>
        <TextInput
          style={formStyles.input}
          placeholder='/orbitdb/Qm.../record'
          onChangeText={(address) => this.setState({address})}
          value={this.state.address}
        />
        <Button
          onClick={this.handleSubmit}>
          <Text>Submit</Text>
        </Button>
      </View>
    )

    return (
      <PageLayout head={head} body={body} />
    )
  }
}
