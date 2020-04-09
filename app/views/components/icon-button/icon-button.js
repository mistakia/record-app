import React from 'react'
import PropTypes from 'prop-types'

import Button from '@components/button'
import Icon from '@components/icon'

import './icon-button.styl'

function IconButton ({ className, icon, label, onClick, type = 'button', disabled, isLoading }) {
  const classNames = ['button__icon', `button__${icon}`, className]

  return (
    <Button
      className={classNames.join(' ')}
      disabled={disabled}
      isLoading={isLoading}
      label={label}
      onClick={onClick}
      type={type}>
      <Icon name={icon} />
    </Button>
  )
}

IconButton.propTypes = {
  className: PropTypes.string,
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'reset', 'submit'])
}

export default IconButton
