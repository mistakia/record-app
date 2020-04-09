import React from 'react'
import PropTypes from 'prop-types'

import LoadingIndicator from '@components/loading-indicator'

import './button.styl'

function Button ({ children, className, label, onClick, count, type = 'button', disabled = false, isLoading }) {
  const classNames = ['button', className]
  const haveCount = typeof count === 'number'

  if (isLoading) disabled = true
  if (haveCount) classNames.push('button__count')

  return (
    <button
      aria-label={label}
      className={classNames.join(' ')}
      onClick={onClick}
      disabled={disabled}
      type={type}>
      {isLoading ? <LoadingIndicator /> : children }
      {haveCount && <span className='count'>{count}</span>}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'reset', 'submit'])
}

export default Button
