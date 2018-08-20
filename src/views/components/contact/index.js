import { connect } from 'react-redux'
import { contactlistActions } from '@core/contactlists'

import Contact from './contact'

const mapDispatchToProps = {
  removeContact: contactlistActions.removeContact
}

export default connect(
  null,
  mapDispatchToProps
)(Contact)
