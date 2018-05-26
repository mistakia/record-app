import React from 'react'
import { connect } from 'react-redux'
import { Text, View, StyleSheet } from 'react-native'
import { Link } from 'react-router-native'

import { contactlistActions } from '@core/contactlists'
import Contactlist from '@components/Contactlist'
import PageLayout from '@layouts/page'

export class ContactsPage extends React.Component {
  componentWillMount () {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadContacts(logId)
  }

  render () {
    const head = (
      <View style={styles.content}>
        <Text>Contacts</Text>
        <Link style={styles.button} to='/contacts/new'><Text>Add Contact</Text></Link>
      </View>
    )

    const body = (
      <Contactlist />
    )

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  button: {
    marginTop: 10,
    padding: 5,
    borderColor: '#CCC',
    borderWidth: 1
  }
})

const mapDispatchToProps = {
  loadContacts: contactlistActions.loadContacts
}

export default connect(
  null,
  mapDispatchToProps
)(ContactsPage)
