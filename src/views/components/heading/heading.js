import React from 'react'

import './heading.styl'

const Heading = ({ title, center = false }) => {
  const classNames = ['heading']
  if (center) {
    classNames.push('center')
  }

  return (
    <div className={classNames.join(' ')}>
      <span>{title}</span>
    </div>
  )
}

export default Heading
