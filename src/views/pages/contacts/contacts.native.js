import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { Text, View } from 'react-native'

import { contactlistActions } from '@core/contactlists'
import Contactlist from '@components/Contactlist'

export class ContactsPage extends React.Component {
  componentWillMount() {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadContacts(logId)    
  }

  render() {
    return (
      <View>
	<Text>Contacts Page</Text>
	<Contactlist />
      </View>
    )
  }
}

const mapDispatchToProps = {
  loadContacts: contactlistActions.loadContacts
}

export default connect(
  null,
  mapDispatchToProps
)(ContactsPage)
