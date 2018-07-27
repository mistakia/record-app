import React from 'react'
import { connect } from 'react-redux'
import {
  Text,
  TextInput,
  View
} from 'react-native'

import Button from '@components/button'
import { contactlistActions } from '@core/contactlists'
import PageLayout from '@layouts/page'
import formStyles from '@styles/form'

export class NewContactPage extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      alias: '',
      address: ''
    }

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit () {
    // TODO: validation
    const { alias, address } = this.state

    if (address && alias) {
      this.props.addContact('/me', { alias, address })
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

const mapDispatchToProps = {
  addContact: contactlistActions.addContact
}

export default connect(
  null,
  mapDispatchToProps
)(NewContactPage)
