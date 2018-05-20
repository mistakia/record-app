import React from 'react'
import { View, Text } from 'react-native'
import { Link } from 'react-router-native'

class Contact extends React.Component {
  render () {
    const { contact } = this.props

    return (
      <View>
        <Text>Alias: {contact.alias}</Text>
        <Text>Address: {contact.address}</Text>
        <Link to={`/tracks${contact.address}`}>Tracks</Link>
      </View>
    )
  }
}

export default Contact
