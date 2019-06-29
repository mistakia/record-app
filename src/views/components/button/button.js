import React from 'react'
import PropTypes from 'prop-types'

import LoadingIndicator from '@components/loading-indicator'

import './button.styl'

function Button ({ children, className, label, onClick, type = 'button', disabled = false, isLoading }) {
  const classNames = ['button', className]

  if (isLoading) disabled = true

  return (
    <button
      aria-label={label}
      className={classNames.join(' ')}
      onClick={onClick}
      disabled={disabled}
      type={type}>
      {isLoading ? <LoadingIndicator /> : children }
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
