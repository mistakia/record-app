import { connect } from 'react-redux'
import { tracklistActions } from '@core/tracklists'

import Track from './track'

const mapDispatchToProps = {
  add: tracklistActions.addTrack,
  remove: tracklistActions.removeTrack
}

export default connect(
  null,
  mapDispatchToProps
)(Track)
