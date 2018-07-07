import React from 'react'
import { View } from 'react-native'

import LoadingIndicator from '@components/LoadingIndicator'
import Contact from '@components/Contact'

export default function Contactlist ({ contacts, displayLoadingIndicator }) {
  const contactItems = contacts.map((contact, index) => {
    return (
      <View key={index}>
        <Contact contact={contact} />
      </View>
    )
  })

  return (
    <View>
      {contactItems}

      <View>
        {(displayLoadingIndicator) ? <LoadingIndicator /> : null}
      </View>
    </View>
  )
}
