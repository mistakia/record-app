import React from 'react'
import LinkIcon from '@material-ui/icons/Link'
import Fab from '@material-ui/core/Fab'
import { Link } from 'react-router-dom'

import EmptyMessage from '@components/empty-message'

const render = ({ logItems, loading, showAdd, log }) => (
  <div className='list'>
    <div className='list__head'>
      {showAdd &&
        <Fab component={Link} to='/link-log'>
          <LinkIcon />
        </Fab>}
    </div>
    <div className='list__header log log__item'>
      <div className='log__main'>
        <div className='log__avatar' />
        <div className='log__title'>Name</div>
      </div>
      <div className='log__side'>
        <div>Last Updated</div>
        <div>Entries</div>
      </div>
    </div>
    <div className='list__body'>
      {logItems}
      {loading}
      {(!loading && !logItems.size) && <EmptyMessage log={log} />}
    </div>
  </div>
)

export default render
