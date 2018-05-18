import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

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
      <section>
	<h1>Contacts Page</h1>
	<Contactlist />
      </section>
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
