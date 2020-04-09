import React from 'react'

import Loading from '@components/loading'
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

  const loading = (displayLoadingIndicator && <Loading loading />)

  return render({ contactItems, loading, showAdd })
}

export default Contactlist
