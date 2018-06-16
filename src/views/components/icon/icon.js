import React from 'react'
import PropTypes from 'prop-types'

import './icon.styl'

function Icon ({ className, name }) {
  const classNames = ['icon', `icon--${name}`, className]
  return (
    <svg className={classNames.join(' ')}>
      <use xlinkHref={`#icon-${name}`} />
    </svg>
  )
}

Icon.propTypes = {
  className: PropTypes.string,
  name: PropTypes.string.isRequired
}

export default Icon
