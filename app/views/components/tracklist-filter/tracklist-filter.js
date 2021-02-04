import React from 'react'
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward'
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward'

import './tracklist-filter.styl'

export default class TracklistFilter extends React.Component {
  render () {
    const { sort, order, reorder, type, title, className } = this.props
    const isActive = (sort && order) && sort === type
    const classNames = ['tracklist__filter', 'cursor', className]
    if (isActive) classNames.push(order)

    return (
      <div className={classNames.join(' ')} onClick={() => reorder(type)}>
        {title || type}
        {isActive && (order === 'asc' ? <ArrowUpwardIcon fontSize='small' /> : <ArrowDownwardIcon fontSize='small' />)}
      </div>
    )
  }
}
