import React from 'react'
import PropTypes from 'prop-types'

import './button.styl'

function Button ({ children, className, label, onClick, type = 'button', disabled = false }) {
  const classNames = ['button', className]
  return (
    <button
      aria-label={label}
      className={classNames.join(' ')}
      onClick={onClick}
      disabled={disabled}
      type={type}>
      {children}
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
