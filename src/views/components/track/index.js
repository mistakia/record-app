import { connect } from 'react-redux'
import { tracklistActions } from '@core/tracklists'

import Track from './track'

const mapDispatchToProps = {
  addTrack: tracklistActions.addTrack,
  removeTrack: tracklistActions.removeTrack
}

export default connect(
  null,
  mapDispatchToProps
)(Track)
