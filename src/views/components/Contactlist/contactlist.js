import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import {
  getCurrentContactlist,
  getContactsForCurrentContactlist
} from '@core/contactlists'
import LoadingIndicator from '@components/LoadingIndicator'
import Contact from '@components/Contact'

class Contactlist extends React.Component {
  render() {
    const { contacts } = this.props

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
	  { this.props.displayLoadingIndicator ? <LoadingIndicator /> : null}
	</div>
      </div>
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
