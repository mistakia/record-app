import React from 'react'

import Button from '@components/button'

import './notification.styl'

class Notification extends React.Component {
  render () {
    const { item, dismiss, dispatch } = this.props

    if (!item) {
      return null
    }

    const { action } = item
    let classNames = ['notification']
    if (action) {
      classNames.push('notification--expanded')
    }

    return (
      <div className={classNames.join(' ')}>
        <div className='notification--text'>{item.text}</div>
        { action &&
          <Button onClick={() => dismiss(item.id) && dispatch(action.onclick())} className='button__text'>{action.text}</Button>}
        <Button onClick={() => dismiss(item.id)} className='button__text'>Dismiss</Button>
      </div>
    )
  }
}

export default Notification
