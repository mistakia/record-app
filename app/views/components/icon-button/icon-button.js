import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

import Button from '@components/button'
import Icon from '@components/icon'

import './icon-button.styl'

function IconButton ({
  className,
  icon,
  label,
  onClick,
  type = 'button',
  disabled,
  isLoading,
  isActive,
  link,
  count
}) {
  const classNames = ['button__icon', `button__${icon}`, className]

  if (link) {
    classNames.push('button')
    return (
      <Link
        className={classNames.join(' ')}
        to={link} >
        <Icon name={icon} />
      </Link>
    )
  }

  return (
    <Button
      className={classNames.join(' ')}
      disabled={disabled}
      isActive={isActive}
      isLoading={isLoading}
      label={label}
      onClick={onClick}
      count={count}
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
