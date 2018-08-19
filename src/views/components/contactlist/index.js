import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentContactlist,
  getContactsForCurrentContactlist
} from '@core/contactlists'
import LoadingIndicator from '@components/loading-indicator'
import Contact from '@components/contact'

import render from './contactlist'

const Contactlist = ({
  contacts,
  displayLoadingIndicator
}) => {
  const contactItems = contacts.map((contact, index) => (
    <Contact contact={contact} key={index} />
  ))

  const loading = (displayLoadingIndicator && <LoadingIndicator />)

  return render(contactItems, loading)
}

const mapStateToProps = createSelector(
  getCurrentContactlist,
  getContactsForCurrentContactlist,
  (contactlist, contacts) => ({
    displayLoadingIndicator: contactlist.isPending,
    contacts
  })
)

export default connect(mapStateToProps, null)(Contactlist)
