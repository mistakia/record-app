import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'

import { contactlistActions } from '@core/contactlists'
import Contactlist from '@components/Contactlist'
import PageLayout from '@layouts/page'

export class ContactsPage extends React.Component {
  componentWillMount () {
    this._load()
  }

  componentDidUpdate () {
    this._load()
  }

  _load () {
    // '/me' or proper orbitdb adadress
    const { logId } = this.props.match.params
    this.props.loadContacts(logId)
  }

  render () {
    const { logId } = this.props.match.params
    const head = (
      <div>
        <h1>Contacts</h1>
        { logId === 'me' && <Link className='button' to='/contacts/new'>Add Contact</Link> }
      </div>
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
