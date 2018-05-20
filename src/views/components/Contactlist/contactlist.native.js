import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import { View } from 'react-native'

import {
  getCurrentContactlist,
  getContactsForCurrentContactlist
} from '@core/contactlists'
import LoadingIndicator from '@components/LoadingIndicator'
import Contact from '@components/Contact'

class Contactlist extends React.Component {
  render () {
    const { contacts } = this.props

    const contactItems = contacts.map((contact, index) => {
      return (
        <View>
          <Contact contact={contact} />
        </View>
      )
    })

    return (
      <View>
        {contactItems}

        <View>
          {(this.props.displayLoadingIndicator) ? <LoadingIndicator /> : null}
        </View>
      </View>
    )
  }
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
