import React from 'react'

import LoadingIndicator from '@components/loading-indicator'
import Contact from '@components/contact'

import render from './contactlist'

const Contactlist = ({
  contacts,
  displayLoadingIndicator,
  showAdd
}) => {
  const contactItems = contacts.map((contact, index) => (
    <Contact type='item' contact={contact} key={index} />
  ))

  const loading = (displayLoadingIndicator && <LoadingIndicator />)

  return render({ contactItems, loading, showAdd })
}

export default Contactlist
