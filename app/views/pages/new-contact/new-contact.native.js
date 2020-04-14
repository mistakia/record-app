import React from 'react'
import {
  Text,
  TextInput,
  View
} from 'react-native'
import queryString from 'query-string'

import Button from '@components/button'
import PageLayout from '@layouts/page'
import formStyles from '@styles/form'

export default class NewContactPage extends React.Component {
  constructor (props) {
    super(props)

    const { logId } = this.props.match.params
    const { alias } = ueryString.parse(this.props.location.search)

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
    const body = (
      <View style={{margin: 20}}>
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
      <PageLayout title='Add Contact' body={body} />
    )
  }
}
