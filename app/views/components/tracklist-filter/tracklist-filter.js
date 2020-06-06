import React from 'react'

import Icon from '@components/icon'

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
        {isActive && <Icon name='arrow-down' />}
      </div>
    )
  }
}
