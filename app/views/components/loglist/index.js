import React from 'react'

import Loading from '@components/loading'
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

  const loading = (displayLoadingIndicator && <Loading loading />)

  return render({ logItems, loading, showAdd, log })
}

export default Loglist
