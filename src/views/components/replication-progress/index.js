import { connect } from 'react-redux'
import { createSelector } from 'reselect'

import { getReplicationProgress, getReplicationStats } from '@core/contacts'

import render from './replication-progress'

const ReplicationProgress = ({ replicationProgress, replicationStats }) => {
  const { progress, total } = replicationProgress
  const { tasksRequested } = replicationStats
  const progressPercent = Math.floor(progress / total * 100)
  if (tasksRequested === 0 || progressPercent === 100) {
    return null
  }

  return render({ progress })
}

const mapStateToProps = createSelector(
  getReplicationProgress,
  getReplicationStats,
  (replicationProgress, replicationStats) => ({ replicationProgress, replicationStats })
)

export default connect(
  mapStateToProps
)(ReplicationProgress)
