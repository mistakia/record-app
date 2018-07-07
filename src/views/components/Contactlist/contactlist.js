import React from 'react'

import LoadingIndicator from '@components/LoadingIndicator'
import Contact from '@components/Contact'

export default function Contactlist ({ contacts, displayLoadingIndicator }) {
  const contactItems = contacts.map((contact, index) => {
    return (
      <div key={index}>
        <Contact contact={contact} />
      </div>
    )
  })

  return (
    <div>
      {contactItems}

      <div>
        { displayLoadingIndicator ? <LoadingIndicator /> : null}
      </div>
    </div>
  )
}
