import React from 'react'
import CircularProgress from '@material-ui/core/CircularProgress'

import Log from '@components/log'

import render from './loglist'

const Loglist = ({
  log,
  logs,
  displayLoadingIndicator,
  showAdd
}) => {
  const logItems = logs.map((log, index) => (
    <Log type='item' log={log} key={index} />
  ))

  const loading = (displayLoadingIndicator &&
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: '32px' }}>
      <CircularProgress />
    </div>
  )

  return render({ logItems, loading, showAdd, log })
}

export default Loglist
