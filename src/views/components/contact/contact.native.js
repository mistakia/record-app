import React from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { Link } from 'react-router-native'

import ItemStyles from '@styles/item'
import TextStyles from '@styles/text'

class Contact extends React.Component {
  render () {
    const { contact } = this.props

    return (
      <Link
        to={`/tracks${contact.address}`}
        component={TouchableOpacity}
        style={ItemStyles.container}>
        <Text style={TextStyles.title}>{contact.alias}</Text>
        <Text style={TextStyles.small}>{contact.address}</Text>
      </Link>
    )
  }
}

export default Contact
