import { connect } from 'react-redux'

import { tracklistActions } from '@core/tracklists'

import NewTrackPage from './new-track'

const mapDispatchToProps = {
  addTrack: tracklistActions.addTrack
}

export default connect(
  null,
  mapDispatchToProps
)(NewTrackPage)
