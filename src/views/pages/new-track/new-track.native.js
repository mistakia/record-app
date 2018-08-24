import React from 'react'
import { connect } from 'react-redux'
import {
  Text,
  TextInput,
  View
} from 'react-native'

import Button from '@components/button'
import PageLayout from '@layouts/page'
import formStyles from '@styles/form'

export default class NewTrackPage extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      url: '',
      title: ''
    }

    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleSubmit () {
    const { url, title } = this.state
    const { app } = this.props

    if (url && title) {
      this.props.addTrack(app.address, { url, title })
    }
  }

  render () {
    const head = (
      <Text>Add Track</Text>
    )

    const body = (
      <View>
        <Text style={formStyles.label}>Title</Text>
        <TextInput
          style={formStyles.input}
          placeholder='Track Title'
          onChangeText={(title) => this.setState({title})} value={this.state.title} />
        <Text style={formStyles.label}>Url</Text>
        <TextInput
          style={formStyles.input}
          placeholder='http://example.com/example'
          onChangeText={(url) => this.setState({url})}
          value={this.state.url}
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
