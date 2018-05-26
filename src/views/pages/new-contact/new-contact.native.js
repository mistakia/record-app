import React from 'react'
import { connect } from 'react-redux'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

import { contactlistActions } from '@core/contactlists'
import PageLayout from '@layouts/page'

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
      this.props.addContact('me', { alias, address })
    }
  }

  render () {
    const head = (
      <Text>Add Contact</Text>
    )

    const body = (
      <View>
        <Text style={styles.label}>Alias</Text>
        <TextInput
           style={styles.input}
           placeholder='Contact Nickname'
           onChangeText={(alias) => this.setState({alias})} value={this.state.alias} />
          <Text style={styles.label}>Address</Text>
          <TextInput
             style={styles.input}
             placeholder='/orbitdb/Qm.../record'
             onChangeText={(address) => this.setState({address})}
            value={this.state.address}
            />
            <TouchableOpacity
               style={styles.button}
               onPress={this.handleSubmit}>
              <Text>Submit</Text>
            </TouchableOpacity>
      </View>
    )

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const styles = StyleSheet.create({
  button: {
    marginLeft: 5,
    marginRight: 5,
    padding: 5,
    borderColor: '#CCC',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  label: {
    backgroundColor: 'white',
    marginLeft: 5,
    marginRight: 5,
    paddingLeft: 5,
    fontSize: 10

  },
  input: {
    backgroundColor: 'white',
    padding: 5,
    marginLeft: 5,
    marginRight: 5,
    marginBottom: 10
  }
})

const mapDispatchToProps = {
  addContact: contactlistActions.addContact
}

export default connect(
  null,
  mapDispatchToProps
)(NewContactPage)
