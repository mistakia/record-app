import React from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import Contact from '@components/contact'
import LoadingIndicator from '@components/loading-indicator'
import { getCurrentProfile, getContactForCurrentProfile } from '@core/profiles'

const Profile = ({
  displayLoadingIndicator,
  removeContact,
  contact
}) => {
  if (displayLoadingIndicator) {
    return <LoadingIndicator />
  }

  return (
    <Contact type='profile' contact={contact} />
  )
}

const mapStateToProps = createSelector(
  getCurrentProfile,
  getContactForCurrentProfile,
  (profile, contact) => ({
    displayLoadingIndicator: profile && profile.isPending,
    contact
  })
)

export default connect(
  mapStateToProps
)(Profile)
