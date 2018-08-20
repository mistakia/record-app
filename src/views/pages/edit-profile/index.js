import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { profileActions, getContactForMyProfile } from '@core/profiles'

import EditProfilePage from './edit-profile'

const mapStateToProps = createSelector(
  getContactForMyProfile,
  (contact) => ({ contact })
)

const mapDispatchToProps = {
  loadProfile: profileActions.loadProfile,
  setProfile: profileActions.setProfile
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditProfilePage)
