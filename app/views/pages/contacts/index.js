import React from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'

import { getApp } from '@core/app'
import {
  contactlistActions,
  getCurrentContactlist,
  getCurrentContactlistContact,
  getContactsForCurrentContactlist
} from '@core/contactlists'
import { contactActions } from '@core/contacts'
import Contactlist from '@components/contactlist'
import PageLayout from '@layouts/page'
import Contact from '@components/contact'

class ContactsPage extends React.Component {
  componentWillMount () {
    this._load()
  }

  componentDidUpdate (prevProps) {
    const { logId } = this.props.match.params
    if (prevProps.match.params.logId !== logId) {
      this._load()
    }
  }

  _load () {
    const { logId } = this.props.match.params
    this.props.loadContacts(logId)
    this.props.loadContact(logId)
  }

  render () {
    const { logId } = this.props.match.params
    const { app, contacts, displayLoadingIndicator, contact } = this.props

    const head = <Contact type='profile' contact={contact} />

    const showAdd = logId === app.address
    const body = <Contactlist {...{contacts, displayLoadingIndicator, showAdd}} />

    return (
      <PageLayout head={head} body={body} />
    )
  }
}

const mapStateToProps = createSelector(
  getApp,
  getCurrentContactlist,
  getContactsForCurrentContactlist,
  getCurrentContactlistContact,
  (app, contactlist, contacts, contact) => ({
    displayLoadingIndicator: contactlist.isPending,
    contacts,
    app,
    contact
  })
)

const mapDispatchToProps = {
  loadContacts: contactlistActions.loadContacts,
  loadContact: contactActions.loadContact
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContactsPage)
