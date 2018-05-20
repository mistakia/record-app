import React from 'react'
import { connect } from 'react-redux'

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
      <h1>Contacts</h1>
    )

    const body = (
      <Contactlist />
    )

    return (
      <PageLayout head={head} body={body} />
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
