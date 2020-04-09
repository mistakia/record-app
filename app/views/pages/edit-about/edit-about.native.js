import React from 'react'
import { Text, TextInput, View } from 'react-native'

import Button from '@components/button'
import PageLayout from '@layouts/page'
import formStyles from '@styles/form'

export default class EditAboutPage extends React.Component {
  constructor (props) {
    super(props)

    const { contact } = this.props
    this.state = {
      name: contact.name,
      location: contact.location,
      bio: contact.bio
    }

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentWillMount () {
    const { app } = this.props
    this.props.loadContact(app.address)
  }

  handleSubmit () {
    const { name, location, bio } = this.state

    if (name && location && bio) {
      this.props.setAbout({ name, location, bio })
    }
  }

  render () {
    const body = (
      <View style={{margin: 20}}>
        <Text style={formStyles.label}>Name</Text>
        <TextInput
          style={formStyles.input}
          placeholder='Name'
          onChangeText={(name) => this.setState({ name })}
          value={this.state.name} />
        <Text style={formStyles.label}>Name</Text>
        <TextInput
          style={formStyles.input}
          placeholder='Location'
          onChangeText={(location) => this.setState({ location })}
          value={this.state.location} />
        <Text style={formStyles.label}>Bio</Text>
        <TextInput
          style={formStyles.input}
          multiline
          placeholder='Bio'
          onChangeText={(bio) => this.setState({ bio })}
          value={this.state.bio} />
        <Button
          onClick={this.handleSubmit}>
          <Text>Submit</Text>
        </Button>
      </View>
    )

    return (
      <PageLayout title='Edit Profile' body={body} />
    )
  }
}
