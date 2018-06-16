import React from 'react'
import PropTypes from 'prop-types'

import Button from '@components/button'
import Icon from '@components/icon'

import './icon-button.styl'


function IconButton({ className, icon, label, onClick, type = 'button' }) {
  const classNames = ['btn--icon', `btn--${icon}`, className]

  return (
    <Button
      className={classNames.join(' ')}
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
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'reset', 'submit'])
}

export default IconButton
